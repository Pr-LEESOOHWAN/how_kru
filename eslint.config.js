// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    // seedFirebase.js는 앱 코드가 아닌 1회용 Node 스크립트이고, expo 파서가 아직 모르는
    // import 속성 문법(`with { type: "json" }`)을 쓴다.
    ignores: ['dist/*', 'src/seedFirebase.js'],
  },
]);
