use std::path::PathBuf;
use std::str::FromStr;

use anyhow::{Context, Result};
use dotenv::dotenv;
use envconfig::Envconfig;
use url::{ParseError as UrlParseError, Url};

pub struct InfluxdbUrls {
    pub ready: Url,
    pub query_api: Url,
}

impl FromStr for InfluxdbUrls {
    type Err = UrlParseError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        let mut base_path = s.to_string();
        if base_path.chars().last() != Some('/') {
            base_path.push('/');
        }
        let base_url: Url = base_path.parse()?;

        Ok(Self {
            ready: base_url.join("ready")?,
            query_api: base_url.join("api/v2/query")?,
        })
    }
}

#[derive(Envconfig)]
pub struct Config {
    pub ui_customization_file: PathBuf,
    pub logo_file: PathBuf,
    #[envconfig(from = "INFLUXDB_BASE_URL")]
    pub influxdb_urls: InfluxdbUrls,
    #[envconfig(from = "INFLUXDB_READ_TOKEN")]
    pub influxdb_token: String,
    pub influxdb_org: String,
    pub influxdb_bucket: String,
}

impl Config {
    pub fn get() -> Result<Self> {
        dotenv().context("failed to get environment variables from .env file")?;
        let config = Config::init_from_env()
            .context("failed to get configuration from environment variables")?;
        Ok(config)
    }
}
