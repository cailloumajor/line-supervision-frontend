use std::env;

use anyhow::{anyhow, Context, Result};
use regex::Regex;
use serde_json::Value as JsonValue;
use toml::Value as TomlValue;

fn camel_case(source: &str) -> String {
    let mut dest = String::with_capacity(source.len());
    let mut capitalize = false;
    for ch in source.chars() {
        if ch == ' ' || ch == '_' {
            capitalize = true;
        } else if capitalize {
            dest.push(ch.to_ascii_uppercase());
            capitalize = false;
        } else {
            dest.push(ch);
        }
    }
    dest[..1].to_ascii_lowercase() + &dest[1..]
}

pub fn replace_env_vars(source: &str) -> Result<String> {
    let re = Regex::new(r"\$\{(?P<env_key>.*?)\}").unwrap();
    let mut out = String::with_capacity(source.len());
    let mut last_match = 0;
    for caps in re.captures_iter(source) {
        let full_match = caps.get(0).unwrap();
        let env_key = caps
            .name("env_key")
            .ok_or(anyhow!("missing environment variable key"))?
            .as_str();
        let replacement = env::var(env_key)
            .with_context(|| format!("failed to get value of {} environment variable", env_key))?;
        out.push_str(&source[last_match..full_match.start()]);
        out.push_str(&replacement);
        last_match = full_match.end();
    }
    out.push_str(&source[last_match..]);
    Ok(out)
}

fn convert(toml_value: TomlValue) -> JsonValue {
    match toml_value {
        TomlValue::Array(arr) => JsonValue::Array(arr.into_iter().map(convert).collect()),
        TomlValue::Boolean(b) => JsonValue::Bool(b),
        TomlValue::Datetime(dt) => JsonValue::String(dt.to_string()),
        TomlValue::Float(f) => match serde_json::Number::from_f64(f) {
            Some(n) => JsonValue::Number(n),
            None => JsonValue::Null,
        },
        TomlValue::Integer(i) => JsonValue::Number(i.into()),
        TomlValue::String(s) => JsonValue::String(s),
        TomlValue::Table(table) => JsonValue::Object(
            table
                .into_iter()
                .map(|(k, v)| (camel_case(&k), convert(v)))
                .collect(),
        ),
    }
}

pub fn toml_to_json(source: &str) -> Result<String> {
    let toml = source.parse().context("failed to parse TOML")?;
    let json = serde_json::to_string(&convert(toml)).context("failed serializing JSON")?;
    Ok(json)
}

#[cfg(test)]
mod tests {
    use std::env;
    use std::fs;
    use std::path::Path;

    #[test]
    fn camel_case() {
        fn t(src: &str, exp: &str) {
            assert_eq!(super::camel_case(src), exp.to_string());
        }

        t("oneword", "oneword");
        t("camelCase", "camelCase");
        t("space separated", "spaceSeparated");
        t("underscore_separated", "underscoreSeparated");
        t("multiple   spaces", "multipleSpaces");
        t("   spaces_underscores_mixed", "spacesUnderscoresMixed");
    }

    #[test]
    fn replace_env_vars() {
        fn t(src: &str, exp: Option<&str>) {
            env::set_var("TEST_ENV_VAR", "test_env_var");
            assert_eq!(super::replace_env_vars(src).ok(), exp.map(String::from));
        }

        t("No placeholder", Some("No placeholder"));
        t(
            "One ${TEST_ENV_VAR} single line",
            Some("One test_env_var single line"),
        );
        t(
            "Multiple ${TEST_ENV_VAR},
        ${TEST_ENV_VAR} multiline",
            Some(
                "Multiple test_env_var,
        test_env_var multiline",
            ),
        );
        t("Fail with missing ${} env var key", None);
        t("Fail with ${UNSET_ENV_VAR}", None);
    }

    #[test]
    fn convert_snapshot() {
        let toml_file = Path::new(file!()).parent().unwrap().join("test.toml");
        let toml_data = fs::read_to_string(toml_file).unwrap();
        insta::assert_yaml_snapshot!(super::convert(toml_data.parse().unwrap()));
    }
}
