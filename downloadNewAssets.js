"use strict"

const path = require("path")
const { EnkaClient } = require("enka-network-api")
const { writeFileSync, existsSync, mkdirSync } = require("fs")
const request = require("request")

const apiBaseUrl = new URL("https://enka.network/ui")
const enka = new EnkaClient({
    defaultLanguage: "jp",
    defaultImageBaseUrl: apiBaseUrl.href
})
const destCharacter = path.join(__dirname, "character")
const destWeapon = path.join(__dirname, "weapon")
const destArtifact = path.join(__dirname, "artifact")

const artifactTypeMap = {
    EQUIP_BRACER    : "flower",
    EQUIP_DRESS     : "crown",
    EQUIP_NECKLACE  : "wing",
    EQUIP_RING      : "cup",
    EQUIP_SHOES     : "clock"
}

// 一覧に載っているがアクセスできないファイル？
const URLBlackList = [
    "https://enka.network/ui/UI_EquipIcon_Claymore_Quartz.png",
    "https://enka.network/ui/UI_EquipIcon_Pole_Flagpole.png",
    "https://enka.network/ui/UI_EquipIcon_Catalyst_Amber.png",
    "https://enka.network/ui/UI_EquipIcon_Bow_Hardwood.png",
    "https://api.ambr.top/assets/UI/UI_EquipIcon_Sword_YoutouEnchanted.png",
    "https://api.ambr.top/assets/UI/UI_EquipIcon_Sword_YoutouShattered.png",
    "https://api.ambr.top/assets/UI/UI_EquipIcon_Claymore_Quartz.png",
    "https://api.ambr.top/assets/UI/UI_EquipIcon_Pole_Flagpole.png",
    "https://api.ambr.top/assets/UI/UI_EquipIcon_Catalyst_Amber.png",
    "https://api.ambr.top/assets/UI/UI_EquipIcon_Bow_Hardwood.png"
]



let dlFlag = 0

if(!existsSync(destCharacter)) mkdirSync(destCharacter)
if(!existsSync(destWeapon)) mkdirSync(destWeapon)
if(!existsSync(destArtifact)) mkdirSync(destArtifact)

// キャラクター
enka.getAllCharacters().forEach((character, c) => {
    try {
        let name = character.name.get()
        let element = character.element.name.get().charAt(0)

        let targetUrl = {
            normalAttack: character.normalAttack.icon.url,
            elementalSkill: character.elementalSkill.icon.url,
            elementalBurst: character.elementalBurst.icon.url,
            splashImage: name === "旅人" ? `https://api.ambr.top/assets/UI/${ character.splashImage.url.split("/").reverse()[0] }` : character.splashImage.url,
            constellations: character.constellations.map(c => c.icon.url)
        }

        // 旅人の場合
        if(name === "旅人") {
            if(character.gender === "MALE") name = `空(${ element })`
            else if(character.gender === "FEMALE") name = `蛍(${ element })`
        }

        let dest = path.join(destCharacter, name)

        if(!existsSync(dest)) mkdirSync(dest)
        Object.keys(targetUrl).forEach(key => {
            // 配列？
            if(targetUrl[key] instanceof Array) {
                targetUrl[key].forEach((con, i) => {
                    const filename = path.join(dest, `constellations${ i + 1 }.png`)
                    // ファイルが存在する？
                    if(!existsSync(filename) && !URLBlackList.includes(con)) {
                        console.log(`Downloading ${ con } ...`)
                        request(con, {
                            method: "GET",
                            encoding: null
                        }, (err, res, body) => {
                            // 正常
                            if(!err && res.statusCode === 200) {
                                writeFileSync(filename, body, "binary")
                                dlFlag++
                            } else {
                                console.log(`Failed request file ${ con }`)
                            }
                        })
                    }
                })
            } else {
                const filename = path.join(dest, `${ key }.png`)
                if(!existsSync(filename) && !URLBlackList.includes(targetUrl[key])) {
                    console.log(`Downloading ${ targetUrl[key] } ...`)
                        request(targetUrl[key], {
                            method: "GET",
                            encoding: null
                        }, (err, res, body) => {
                            // 正常
                            if(!err && res.statusCode === 200) {
                                console.log(name)
                                writeFileSync(filename, body, "binary")
                                dlFlag++
                            } else {
                                console.log(`Failed request file ${ targetUrl[key] }`)
                            }
                        })
                }
            }
        })
    } catch(errO) {
        console.log(errO)
    }
})

// キャラクターコスチューム
enka.getAllCostumes().forEach(cos => {
    if(cos.splashImage) {
        let charId = cos.characterId
        let charName = enka.getCharacterById(charId).name.get()
        let destCharName = path.join(destCharacter, charName)
        let destCostume = path.join(destCharName, "costumes")
        let filename = path.join(destCostume, `${ cos.name.get() }.png`)
        let imageUrl = cos.splashImage.url

        if(!existsSync(destCharName)) mkdirSync(destCharName)
        if(!existsSync(destCostume)) mkdirSync(destCostume)
        if(!existsSync(filename) && !URLBlackList.includes(imageUrl)) {
            console.log(`Downloading ${ imageUrl } ...`)
            request(imageUrl, {
                method: "GET",
                encoding: null
            }, (err, res, body) => {
                // 正常
                if(!err && res.statusCode === 200) {
                    writeFileSync(filename, body, "binary")
                    dlFlag++
                } else {
                    console.log(`Failed request file ${ imageUrl }`)
                }
            })
        }
    }
})

// 武器
enka.getAllWeapons().forEach(weapon => {
    weapon.awakenIcon
    let name = weapon.name.get()
    let imageUrl = `https://api.ambr.top/assets/UI/${ weapon.icon.url.split("/").reverse()[0] }`
    let filename = path.join(destWeapon, `${ name }.png`)

    if(!existsSync(filename) && !URLBlackList.includes(imageUrl)) {
        console.log(`Downloading ${ imageUrl } ...`)
        request(imageUrl, {
            method: "GET",
            encoding: null
        }, (err, res, body) => {
            // 正常
            if(!err && res.statusCode === 200) {
                writeFileSync(filename, body, "binary")
                dlFlag++
            } else {
                console.log(`Failed request file ${ imageUrl }`)
            }
        })
    }
})

// 聖遺物
enka.getAllArtifacts().forEach(artifact => {
    let setName = artifact.set.name.get()
    let type = artifact.equipType
    let imageUrl = artifact.icon.url
    let dest = path.join(destArtifact, setName)
    let filename = path.join(dest, `${ artifactTypeMap[type] }.png`)

    if(!existsSync(dest)) mkdirSync(dest)
    // 画像が存在しない場合
    if(!existsSync(filename) && !URLBlackList.includes(imageUrl)) {
        console.log(`Downloading ${ imageUrl } ...`)
        request(imageUrl, {
            method: "GET",
            encoding: null
        }, (err, res, body) => {
            // 正常
            if(!err && res.statusCode === 200) {
                writeFileSync(filename, body, "binary")
                dlFlag++
            } else {
                console.log(`Failed request file ${ imageUrl }`)
            }
        })
    }
})



// request-promiseモジュールで実装したい
// if(dlFlag > 0) {
//     console.log(`Downloaded ${ dlFlag } data.`)
// } else {
//     console.log("Not found new image data.")
// }
