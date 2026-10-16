//! Mic capture (cpal): default input -> mono f32 -> 16kHz i16 + live level meter.
use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use std::sync::{Arc, Mutex};

pub struct Recorder {
    _stream: cpal::Stream, // drop hote hi recording rukti hai
    samples: Arc<Mutex<Vec<f32>>>,
    level: Arc<Mutex<f32>>,
    rate: u32,
}

impl Recorder {
    pub fn start() -> Result<Self, String> {
        let host = cpal::default_host();
        let device = host
            .default_input_device()
            .ok_or_else(|| "koi mic nahi mila".to_string())?;
        let config = device
            .default_input_config()
            .map_err(|e| format!("mic config: {e}"))?;
        let channels = config.channels();
        let rate = config.sample_rate();
        let fmt = config.sample_format();

        let dev_name = device
            .description()
            .map(|d| d.name().to_string())
            .unwrap_or_else(|_| "?".to_string());
        crate::log(&format!("mic: {dev_name} {rate}Hz {channels}ch"));

        let samples = Arc::new(Mutex::new(Vec::<f32>::new()));
        let level = Arc::new(Mutex::new(0f32));

        let stream = match fmt {
            cpal::SampleFormat::F32 => {
                let s = samples.clone();
                let l = level.clone();
                device
                    .build_input_stream(
                        config.clone().into(),
                        move |data: &[f32], _: &_| push_f32(data, channels, &s, &l),
                        |e| eprintln!("audio err: {e}"),
                        None,
                    )
                    .map_err(|e| format!("mic stream: {e}"))?
            }
            cpal::SampleFormat::I16 => {
                let s = samples.clone();
                let l = level.clone();
                device
                    .build_input_stream(
                        config.clone().into(),
                        move |data: &[i16], _: &_| {
                            let f: Vec<f32> =
                                data.iter().map(|x| *x as f32 / 32768.0).collect();
                            push_f32(&f, channels, &s, &l)
                        },
                        |e| eprintln!("audio err: {e}"),
                        None,
                    )
                    .map_err(|e| format!("mic stream: {e}"))?
            }
            cpal::SampleFormat::U16 => {
                let s = samples.clone();
                let l = level.clone();
                device
                    .build_input_stream(
                        config.clone().into(),
                        move |data: &[u16], _: &_| {
                            let f: Vec<f32> =
                                data.iter().map(|x| *x as f32 / 65535.0 * 2.0 - 1.0).collect();
                            push_f32(&f, channels, &s, &l)
                        },
                        |e| eprintln!("audio err: {e}"),
                        None,
                    )
                    .map_err(|e| format!("mic stream: {e}"))?
            }
            f => return Err(format!("unsupported sample format: {f:?}")),
        };
        stream
            .play()
            .map_err(|e| format!("mic start: {e}"))?;
        Ok(Self {
            _stream: stream,
            samples,
            level,
            rate,
        })
    }

    /// Recording roko, 16kHz mono i16 samples wapas.
    pub fn stop(self) -> Vec<i16> {
        let mono = std::mem::take(&mut *self.samples.lock().unwrap());
        drop(self._stream);
        resample_to_16k_i16(&mono, self.rate)
    }

    pub fn level(&self) -> f32 {
        *self.level.lock().unwrap()
    }
}

fn push_f32(
    data: &[f32],
    channels: u16,
    samples: &Arc<Mutex<Vec<f32>>>,
    level: &Arc<Mutex<f32>>,
) {
    let ch = channels.max(1) as usize;
    let mut v = samples.lock().unwrap();
    let mut sum = 0f64;
    let mut n = 0u64;
    for frame in data.chunks(ch) {
        let m: f32 = frame.iter().sum::<f32>() / ch as f32;
        v.push(m);
        sum += (m as f64) * (m as f64);
        n += 1;
    }
    if n > 0 {
        *level.lock().unwrap() = ((sum / n as f64).sqrt() as f32 * 4.0).min(1.0);
    }
}

fn resample_to_16k_i16(mono: &[f32], rate: u32) -> Vec<i16> {
    if mono.is_empty() || rate == 0 {
        return Vec::new();
    }
    if rate == 16000 {
        return mono
            .iter()
            .map(|s| (s.clamp(-1.0, 1.0) * 32767.0) as i16)
            .collect();
    }
    let out_len = ((mono.len() as u64 * 16000) / rate as u64) as usize;
    let mut out = Vec::with_capacity(out_len);
    for i in 0..out_len {
        let pos = i as f64 * rate as f64 / 16000.0;
        let i0 = (pos.floor() as usize).min(mono.len() - 1);
        let i1 = (i0 + 1).min(mono.len() - 1);
        let frac = (pos - pos.floor()) as f32;
        let s = mono[i0] + (mono[i1] - mono[i0]) * frac;
        out.push((s.clamp(-1.0, 1.0) * 32767.0) as i16);
    }
    out
}

/// i16 samples -> WAV bytes (16kHz mono).
pub fn to_wav(samples: &[i16]) -> Vec<u8> {
    let spec = hound::WavSpec {
        channels: 1,
        sample_rate: 16000,
        bits_per_sample: 16,
        sample_format: hound::SampleFormat::Int,
    };
    let mut buf = std::io::Cursor::new(Vec::new());
    let mut w = hound::WavWriter::new(&mut buf, spec).expect("wav writer");
    for s in samples {
        w.write_sample(*s).expect("wav sample");
    }
    w.finalize().expect("wav finalize");
    buf.into_inner()
}
