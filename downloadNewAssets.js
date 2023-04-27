"use strict"

const path = require("path")
const { EnkaClient } = require("enka-network-api")
const { writeFileSync, existsSync, mkdirSync } = require("fs")
const request = require("request")
const { exit } = require("process")

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
]



let dlFlag = 0

// キャラクター
if(!existsSync(destCharacter)) mkdirSync(destCharacter)

enka.getAllCharacters().forEach((character, c) => {
    try {
        let name = character.name.get()
        const targetUrl = {
            normalAttack: character.normalAttack.icon.url,
            elementalSkill: character.elementalSkill.icon.url,
            elementalBurst: character.elementalBurst.icon.url,
            splashImage: character.splashImage.url,
            constellations: character.constellations.map(c => c.icon.url)
        }
        const dest = path.join(destCharacter, name)

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

// 武器
if(!existsSync(destWeapon)) mkdirSync(destWeapon)

enka.getAllWeapons().forEach(weapon => {
    let name = weapon.name.get()
    let imageUrl = weapon.icon.url
    const filename = path.join(destWeapon, `${ name }.png`)

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
if(!existsSync(destArtifact)) mkdirSync(destArtifact)

enka.getAllArtifacts().forEach(artifact => {
    let setName = artifact.set.name.get()
    let type = artifact.equipType
    let imageUrl = artifact.icon.url
    const dest = path.join(destArtifact, setName)
    const filename = path.join(dest, `${ artifactTypeMap[type] }.png`)

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



if(dlFlag > 0) {
    console.log(`Downloaded ${ dlFlag } data.`)
} else {
    console.log("Not found new image data.")
}
