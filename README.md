# aig-for-nodejs

[ArtifacterImageGen](https://github.com/FuroBath/ArtifacterImageGen/tree/master)のNodeJS版。

## Installation

```
npm i aig-for-nodejs
```

## Usage
アセットをダウンロードするスクリプトを実行します(多少時間がかかります)。
数回このスクリプトを実行して、コンソールにログが流れなくなるまで実行してください。

```
node node_modules/aig-for-nodejs/downloadNewAssets.js
```

[enka-network-api](https://www.npmjs.com/package/enka-network-api)(必須)でユーザー情報をフェッチし、[sharp](https://www.npmjs.com/package/sharp)で画像を保存する例。
```js
const { EnkaClient, Character } = require("enka-network-api")
const sharp = require("sharp")
const { generate } = require("aig-for-nodejs")

const enka = new EnkaClient({
    defaultLanguage: "jp"
})

// ユーザー情報をfetch
enka.fetchUser("8********").then(result => {
    let character = result.characters[0]
    return generate(character)
}).then(imageBuffer => {
    // sharpを使ってBufferを画像として保存
    sharp(imageBuffer).toFile("artifacter.png")
})
```