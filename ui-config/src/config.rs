use std::ops::Div;
use std::path::PathBuf;
use std::str::FromStr;

use anyhow::{Context, Result};
use dotenv::dotenv;
use envconfig::Envconfig;
use url::Url;

#[derive(Clone)]
pub struct BaseUrl(Url);

impl FromStr for BaseUrl {
    type Err = url::ParseError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        let mut base_path = s.to_string();
        if !base_path.ends_with('/') {
            base_path.push('/');
        }
        let base_url: Url = base_path.parse()?;

        Ok(Self(base_url))
    }
}

impl Div<&str> for BaseUrl {
    type Output = Url;

    fn div(self, rhs: &str) -> Self::Output {
        self.0.join(rhs).unwrap()
    }
}

#[derive(Envconfig)]
pub struct Config {
    pub ui_customization_file: PathBuf,
    pub logo_file: PathBuf,
    pub influxdb_base_url: BaseUrl,
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

#[cfg(test)]
mod tests {
    use test_case::test_case;

    use super::*;

    #[test_case("http://:8000" => panics "EmptyHost" ; "URL parse error")]
    #[test_case("http://host:8080" => "http://host:8080/" ; "appends slash")]
    #[test_case("http://host:8000/" => "http://host:8000/" ; "keeps slash")]
    #[test_case("http://host/path" => "http://host/path/" ; "appends slash to path")]
    #[test_case("http://host/path/" => "http://host/path/" ; "keeps slash after path")]
    fn base_url_from_str(string: &str) -> String {
        let base_url: BaseUrl = string.parse().unwrap();

        base_url.0.into()
    }

    #[test_case("subpath" => "http://host/path/subpath" ; "bare subpath")]
    #[test_case("/newpath" => "http://host/newpath" ; "leading slash")]
    #[test_case("subpath/" => "http://host/path/subpath/" ; "trailing slash")]
    fn base_url_div(subpath: &str) -> String {
        const BASE: &str = "http://host/path/";
        let base_url = BaseUrl(Url::parse(BASE).unwrap());

        (base_url / subpath).into()
    }
}
