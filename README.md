# aig-for-nodejs

[ArtifacterImageGen](https://github.com/FuroBath/ArtifacterImageGen/tree/master)のNodeJS版。

## Installation

```
npm i aig-for-nodejs
```

## Usage

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