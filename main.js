"use strict"

const path = require("path")
const { EnkaClient, Character, Artifact } = require("enka-network-api")
const sharp = require("sharp")
const Jimp = require("jimp")
const { text2image, roundedRect, rgba } = require("./imgUtil")
const { exit } = require("process")

const testPath = path.join(__dirname, "test")
const assetsPath = path.join(__dirname, "assets")
const fontPath = path.join(assetsPath, "ja-jp.ttf")
const basePath = path.join(__dirname, "base")
const characterPath = path.join(__dirname, "character")
const weaponPath = path.join(__dirname, "weapon")
const constellationPath = path.join(__dirname, "constellation")
const emotePath = path.join(__dirname, "emotes")

const baseSize = {
    width: 1920,
    height: 1080
}

const enka = new EnkaClient({
    defaultLanguage: "jp",
    defaultImageBaseUrl: "https://enka.network/ui"
})

const fightProp = {
    FIGHT_PROP_HP               : "HP",
    FIGHT_PROP_HP_PERCENT       : "HPパーセンテージ",
    FIGHT_PROP_ATTACK           : "攻撃力",
    FIGHT_PROP_ATTACK_PERCENT   : "攻撃パーセンテージ",
    FIGHT_PROP_DEFENSE          : "防御力",
    FIGHT_PROP_DEFENSE_PERCENT  : "防御パーセンテージ",
    FIGHT_PROP_ELEMENT_MASTERY  : "元素熟知",
    FIGHT_PROP_CRITICAL         : "会心率",
    FIGHT_PROP_CRITICAL_HURT    : "会心ダメージ",
    FIGHT_PROP_HEAL_ADD         : "与える治療効果",
    FIGHT_PROP_CHARGE_EFFICIENCY: "元素チャージ効率",
    FIGHT_PROP_FIRE_ADD_HURT    : "炎元素ダメージ",
    FIGHT_PROP_WATER_ADD_HURT   : "水元素ダメージ",
    FIGHT_PROP_GRASS_ADD_HURT   : "草元素ダメージ",
    FIGHT_PROP_ELEC_ADD_HURT    : "雷元素ダメージ",
    FIGHT_PROP_WIND_ADD_HURT    : "風元素ダメージ",
    FIGHT_PROP_ICE_ADD_HURT     : "氷元素ダメージ",
    FIGHT_PROP_ROCK_ADD_HURT    : "岩元素ダメージ",
    FIGHT_PROP_PHYSICAL_ADD_HURT: "物理ダメージ"
}



/**
 * 聖遺物のスコア計算
 * @param {Artifact} artifact 聖遺物
 * @param {"hp"|"atk"|"def"|"chg"|"mst"} type 換算
 * @returns {Number} 
 */
const calcScore = (artifact, type="atk") => {
    let score = 0
    artifact.substats.total.forEach(stat => {
        let value = Math.floor(stat.getFormattedValue() * 10) / 10

        // 会心率
        if(fightProp[stat.id] === "会心率") {
            score += (value * 2)
        }
        // 会心ダメージ
        if(fightProp[stat.id] === "会心ダメージ") {
            score += value
        }

        // HP%, 攻撃力%, 防御力%, 元素チャージ効率換算
        if(
            (type === "hp"  && fightProp[stat.id] === "HPパーセンテージ")  ||
            (type === "atk" && fightProp[stat.id] === "攻撃パーセンテージ") ||
            (type === "def" && fightProp[stat.id] === "防御パーセンテージ") ||
            (type === "chg" && fightProp[stat.id] === "元素チャージ効率")
        ) {
            score += value
        }
        // 元素熟知換算
        if(type == "mst" && fightProp[stat.id] === "元素熟知") {
            score += (value * 0.25)
        }
    })

    return Math.round(score * 10) / 10
}

/**
 * 
 * @param {Character} character 
 * @param {"hp"|"atk"|"def"|"chg"|"mst"} calcType 
 */
const generate = async (character, calcType) => {
    // キャラクター
    const characterElement          = character.characterData.element.name.get("jp").charAt(0)
    const characterName             = ["空", "蛍"].includes(character.characterData.name.get("jp")) ?
                                      (character.characterData.gender === "MALE" ? `空(${ characterElement })` : `蛍(${ characterElement })`) :
                                      character.characterData.name.get("jp")
    const characterStatus           = character.status
    const characterMaxHealth        = Math.round(characterStatus.maxHealth.getFormattedValue()).toLocaleString()
    const characterBaseHealth       = Math.round(characterStatus.healthBase.getFormattedValue()).toLocaleString()
    const characterAddHealth        = (Math.round(characterStatus.maxHealth.getFormattedValue()) - Math.round(characterStatus.healthBase.getFormattedValue())).toLocaleString()
    const characterAttack           = Math.round(characterStatus.attack.getFormattedValue()).toLocaleString()
    const characterBaseAttack       = Math.round(characterStatus.attackBase.getFormattedValue()).toLocaleString()
    const characterAddAttack        = (Math.round(characterStatus.attack.getFormattedValue()) - Math.round(characterStatus.attackBase.getFormattedValue())).toLocaleString()
    const characterDefense          = Math.round(characterStatus.defense.getFormattedValue()).toLocaleString()
    const characterBaseDefense      = Math.round(characterStatus.defenseBase.getFormattedValue()).toLocaleString()
    const characterAddDefense       = (Math.round(characterStatus.defense.getFormattedValue()) - Math.round(characterStatus.defenseBase.getFormattedValue())).toLocaleString()
    const characterElementMastery   = Math.round(characterStatus.elementMastery.getFormattedValue()).toLocaleString()
    const characterCritRate         = characterStatus.critRate.getFormattedValue().toFixed(1)
    const characterCritDamage       = characterStatus.critDamage.getFormattedValue().toFixed(1)
    const characterChargeEfficiency = characterStatus.chargeEfficiency.getFormattedValue().toFixed(1)
    const characterPyroDamage       = {
        name: characterStatus.pyroDamage.type.get("jp"),
        value: Math.round(characterStatus.pyroDamage.getFormattedValue() * 10) / 10
    }
    const characterHydroDamage      = {
        name: characterStatus.hydroDamage.type.get("jp"),
        value: Math.round(characterStatus.hydroDamage.getFormattedValue() * 10) / 10
    }
    const characterCryoDamage       = {
        name: characterStatus.cryoDamage.type.get("jp"),
        value: Math.round(characterStatus.cryoDamage.getFormattedValue() * 10) / 10
    }
    const characterElectroDamage    = {
        name: characterStatus.electroDamage.type.get("jp"),
        value: Math.round(characterStatus.electroDamage.getFormattedValue() * 10) / 10
    }
    const characterDendroDamage     = {
        name: characterStatus.dendroDamage.type.get("jp"),
        value: Math.round(characterStatus.dendroDamage.getFormattedValue() * 10) / 10
    }
    const characterAnemoDamage      = {
        name: characterStatus.anemoDamage.type.get("jp"),
        value: Math.round(characterStatus.anemoDamage.getFormattedValue() * 10) / 10
    }
    const characterGeoDamage        = {
        name: characterStatus.geoDamage.type.get("jp"),
        value: Math.round(characterStatus.geoDamage.getFormattedValue() * 10) / 10
    }
    const characterPhysicalDamage   = {
        name: characterStatus.physicalDamage.type.get("jp"),
        value: Math.round(characterStatus.physicalDamage.getFormattedValue() * 10) / 10
    }
    const characterHealAdd          = {
        name: characterStatus.healAdd.type.get("jp"),
        value: Math.round(characterStatus.healAdd.getFormattedValue() * 10) / 10
    }
    const characterMaxValueStatus   = [
        characterPyroDamage, 
        characterHydroDamage, 
        characterCryoDamage, 
        characterElectroDamage, 
        characterDendroDamage, 
        characterAnemoDamage, 
        characterGeoDamage, 
        characterPhysicalDamage, 
        characterHealAdd
    ].reduce((a, b) => a.value > b.value ? a : b)
    const characterConstellations   = character.unlockedConstellations
    const characterLevel            = character.level
    const characterFriendship       = character.friendship
    const characterTalent           = {
        normalAttack    : character.skillLevels[0].level.value,
        elementalSkill  : character.skillLevels[1].level.value,
        elementalBurst  : character.skillLevels[2].level.value
    }
    
    // 武器
    const weapon                    = character.weapon
    const weaponName                = weapon.weaponData.name.get("jp")
    const weaponLevel               = weapon.level
    const weaponRank                = weapon.refinementRank
    const weaponRarelity            = weapon.weaponData.stars
    const weaponBaseAtk             = weapon.weaponStats[0].value
    const weaponSubStatusName       = weapon.weaponStats[1] ?
                                      weapon.weaponStats[1].type.get("jp") :
                                      undefined
    const weaponSubStatusValue      = weapon.weaponStats[1] ?
                                      weapon.weaponStats[1].isPercent ?
                                      weapon.weaponStats[1].getFormattedValue().toFixed(1) :
                                      weapon.weaponStats[1].getFormattedValue().toFixed() :
                                      undefined
    const weaponSubStatusType       = weapon.weaponStats[1] ?
                                      weapon.weaponStats[1].type.get("jp") :
                                      undefined

    // 聖遺物
    const artifacts                 = character.artifacts
    const scoreFlower               = calcScore(artifacts[0], calcType)
    const scoreWing                 = calcScore(artifacts[1], calcType)
    const scoreClock                = calcScore(artifacts[2], calcType)
    const scoreCup                  = calcScore(artifacts[3], calcType)
    const scoreCrown                = calcScore(artifacts[4], calcType)



    // ベース
    let base = await Jimp.read(path.join(basePath, `${ characterElement }.png`))
    let shadow = await Jimp.read(path.join(assetsPath, "Shadow.png"))



    // キャラクター
    let characterPaste = new Jimp(baseSize.width, baseSize.height).rgba(true)
    let characterImage = (await Jimp.read(path.join(characterPath, characterName, "splashImage.png")))
        .crop(289, 0, 1728, 1024)
        .scale(0.75)
    let characterAvatarMask = (await Jimp.read(path.join(assetsPath, "CharacterMask.png")))
        .grayscale()
        .resize(Math.floor((1728 - 289) * 0.75), Math.floor(1024 * 0.75))

    characterPaste.composite(characterImage.mask(characterAvatarMask), -160, -45)



    // 武器
    let weaponImage = (await Jimp.read(path.join(weaponPath, `${ weaponName }.png`)))
        .resize(128, 128)
    let weaponPaste = new Jimp(baseSize.width, baseSize.height)

    let weaponNameImage = await Jimp.read(
        await text2image(weaponName, {
            fontLocation: fontPath,
            fontSize: 26,
            fontColor: "#FFF"
        })
    )
    let weaponLevelImage = await Jimp.read(
        await text2image(`Lv.${ weaponLevel }`, {
            fontLocation: fontPath,
            fontSize: 24,
            fontColor: "#FFF"
        })
    )
    let rectWeaponLevel = await Jimp.read(
        await roundedRect(1582, 80, 1582 + weaponLevelImage.bitmap.width + 4, 108, 1)
    )

    let baseAttackIcon = (await Jimp.read(path.join(emotePath, "基礎攻撃力.png")))
        .resize(23, 23)
    let weaponBaseAttackImage = await Jimp.read(
        await text2image(`基礎攻撃力  ${ weaponBaseAtk }`, {
            fontLocation: fontPath,
            fontSize: 23,
            fontColor: "#FFF"
        })
    )

    weaponPaste
        .composite(weaponImage, 1430, 50)
        .composite(weaponNameImage, 1582, 47)
        .composite(rectWeaponLevel, 0, 0)
        .composite(weaponLevelImage, 1584, 82)
        .composite(baseAttackIcon, 1600, 120)
        .composite(weaponBaseAttackImage, 1623, 120)

    const statusNameMap = {
        HP: {
            short: "HP%",
            long: "HPパーセンテージ"
        },
        攻撃力: {
            short: "攻撃%",
            long: "攻撃パーセンテージ"
        },
        防御力: {
            short: "防御%",
            long: "防御パーセンテージ"
        },
        元素チャージ効率: {
            short: "元チャ効率",
            long: "元素チャージ効率"
        }
    }
    
    if(weaponSubStatusValue) {
        let weaponSubStatusIcon = (await Jimp.read(path.join(emotePath, `${ ["HP", "攻撃力", "防御力"].includes(weaponSubStatusType) ? statusNameMap[weaponSubStatusType].long : weaponSubStatusType }.png`)))
            .resize(23, 23)
        let weaponSubStatusImage = await Jimp.read(
            await text2image(`${ Object.keys(statusNameMap).includes(weaponSubStatusName) ? statusNameMap[weaponSubStatusName].short : weaponSubStatusName }  ${ weaponSubStatusValue }${ weapon.weaponStats[1].isPercent ? "%" : "" }`, {
                fontLocation: fontPath,
                fontSize: 23,
                fontColor: "#FFF"
            })
        )

        weaponPaste
            .composite(weaponSubStatusIcon, 1600, 155)
            .composite(weaponSubStatusImage, 1623, 155)
    }

    let weaponRareImage = (await Jimp.read(path.join(assetsPath, "Rarelity", `${ weaponRarelity }.png`)))
        .scale(0.97)
    let weaponRarePaste = new Jimp(baseSize.width, baseSize.height)
    
    weaponRarePaste
        .composite(weaponRareImage, 1422, 173)

    

    // 天賦
    let talentBase = (await Jimp.read(path.join(assetsPath, "TalentBack.png")))
        .scale(2/3)
    let talentBasePaste = new Jimp(baseSize.width, baseSize.height)

    await Promise.all(Object.keys(characterTalent).map(async (t, i) => {
        let talentPaste = new Jimp(talentBase.bitmap.width, talentBase.bitmap.height)
        let talent = (await Jimp.read(path.join(characterPath, characterName, `${ t }.png`)))
            .resize(50, 50)
        talentPaste.composite(talent, Math.floor(talentPaste.bitmap.width/2)-25, Math.floor(talentPaste.bitmap.height/2)-25)
        
        let talentBaseClone = talentBase.clone()
            .composite(talentPaste, 0, 0)
        talentBasePaste.composite(talentBaseClone, 15, 330 + i*105)
    }))



    // 凸
    let constBase = (await Jimp.read(path.join(constellationPath, `${ characterElement }.png`)))
        .resize(90, 90)
    let constLock = (await Jimp.read(path.join(constellationPath, `${ characterElement }LOCK.png`)))
        .resize(90, 90)
    let constBasePaste = new Jimp(baseSize.width, baseSize.height)

    for(let i = 1; i < 7; i++) {
        if(i > characterConstellations.length) {
            constBasePaste.composite(constLock, 666, -10 + i*93)
        } else {
            let charConst = (await Jimp.read(path.join(characterPath, characterName, `constellations${ i }.png`)))
                .resize(45, 45)
            let constPaste = new Jimp(constBase.bitmap.width, constBase.bitmap.height)
            constPaste.composite(charConst, Math.floor(constPaste.bitmap.width/2) - 25, Math.floor(constPaste.bitmap.height/2) - 23)
        
            let constBaseClone = constBase.clone()
                .composite(constPaste, 0, 0)
            constBasePaste.composite(constBaseClone, 666, -10 + i*93)
        }
    }



    // 左上のテキスト等
    let characterInfoPaste = new Jimp(baseSize.width, baseSize.height)
    let characterNameImage = await Jimp.read(
        await text2image(characterName, {
            fontLocation: fontPath,
            fontSize: 48,
            fontColor: "#FFF"
        })
    )
    let characterLevelImage = await Jimp.read(
        await text2image(`Lv.${ characterLevel }`, {
            fontLocation: fontPath,
            fontSize: 25,
            fontColor: "#FFF"
        })
    )
    let friendshipImage = await Jimp.read(
        await text2image(`${ characterFriendship }`, {
            fontLocation: fontPath,
            fontSize: 25,
            fontColor: "#FFF"
        })
    )
    let rectFriendShip = await Jimp.read(
        await roundedRect(
            35 + characterLevelImage.bitmap.width + 5, 
            74, 
            77 + characterLevelImage.bitmap.width + friendshipImage.bitmap.width, 
            102, 
            2
        )
    )
    let friendshipIcon = (await Jimp.read(path.join(assetsPath, "Love.png")))
    friendshipIcon.resize(friendshipIcon.bitmap.width * (24 / friendshipIcon.bitmap.height), 24)

    let normalAttackLevelImage = await Jimp.read(
        await text2image(`Lv.${ characterTalent.normalAttack }`, {
            fontLocation: fontPath,
            fontSize: 17,
            fontColor: characterTalent.normalAttack >= 10 ? "#0FF" : "#FFF"
        })
    )
    let elementalSkillLevelImage = await Jimp.read(
        await text2image(`Lv.${ characterTalent.elementalSkill }`, {
            fontLocation: fontPath,
            fontSize: 17,
            fontColor: characterTalent.elementalSkill >= 10 ? "#0FF" : "#FFF"
        })
    )
    let elementalBurstLevelImage = await Jimp.read(
        await text2image(`Lv.${ characterTalent.elementalBurst }`, {
            fontLocation: fontPath,
            fontSize: 17,
            fontColor: characterTalent.elementalBurst >= 10 ? "#0FF" : "#FFF"
        })
    )

    characterInfoPaste
        .composite(characterNameImage, 30, 20)
        .composite(characterLevelImage, 35, 75)
        .composite(rectFriendShip, 0, 0)
        .composite(friendshipIcon, 42 + Math.floor(characterLevelImage.bitmap.width), 76)
        .composite(friendshipImage, 73 + characterLevelImage.bitmap.width, 74)
        .composite(normalAttackLevelImage, 42, 397)
        .composite(elementalSkillLevelImage, 42, 502)
        .composite(elementalBurstLevelImage, 42, 607)



    // キャラクターステータス
    let characterStatusPaste = new Jimp(baseSize.width, baseSize.height)

    // HP
    let baseHealthImage = await Jimp.read(
        await text2image(characterBaseHealth, {
            fontLocation: fontPath,
            fontSize: 12,
            fontColor: "#FFF"
        })
    )
    let addHealthImage = await Jimp.read(
        await text2image(`+${ characterAddHealth }`, {
            fontLocation: fontPath,
            fontSize: 12,
            fontColor: "#0F0"
        })
    )
    let maxHealthImage = await Jimp.read(
        await text2image(characterMaxHealth, {
            fontLocation: fontPath,
            fontSize: 26,
            fontColor: "#FFF"
        })
    )

    // 攻撃力
    let baseAttackImage = await Jimp.read(
        await text2image(characterBaseAttack, {
            fontLocation: fontPath,
            fontSize: 12,
            fontColor: "#FFF"
        })
    )
    let addAttackImage = await Jimp.read(
        await text2image(`+${ characterAddAttack }`, {
            fontLocation: fontPath,
            fontSize: 12,
            fontColor: "#0F0"
        })
    )
    let attackImage = await Jimp.read(
        await text2image(characterAttack, {
            fontLocation: fontPath,
            fontSize: 26,
            fontColor: "#FFF"
        })
    )

    // 防御力
    let baseDefenseImage = await Jimp.read(
        await text2image(characterBaseDefense, {
            fontLocation: fontPath,
            fontSize: 12,
            fontColor: "#FFF"
        })
    )
    let addDefenseImage = await Jimp.read(
        await text2image(`+${ characterAddDefense }`, {
            fontLocation: fontPath,
            fontSize: 12,
            fontColor: "#0F0"
        })
    )
    let defenseImage = await Jimp.read(
        await text2image(characterDefense, {
            fontLocation: fontPath,
            fontSize: 26,
            fontColor: "#FFF"
        })
    )

    // 元素熟知
    let elementMasteryImage = await Jimp.read(
        await text2image(characterElementMastery, {
            fontLocation: fontPath,
            fontSize: 26,
            fontColor: "#FFF"
        })
    )

    // 会心率
    let critRateImage = await Jimp.read(
        await text2image(`${ characterCritRate }%`, {
            fontLocation: fontPath,
            fontSize: 26,
            fontColor: "#FFF"
        })
    )

    // 会心ダメージ
    let critDamageImage = await Jimp.read(
        await text2image(`${ characterCritDamage }%`, {
            fontLocation: fontPath,
            fontSize: 26,
            fontColor: "#FFF"
        })
    )

    // 元素チャージ効率
    let chargeEfficiencyImage = await Jimp.read(
        await text2image(`${ characterChargeEfficiency }%`, {
            fontLocation: fontPath,
            fontSize: 26,
            fontColor: "#FFF"
        })
    )

    characterStatusPaste
        .composite(baseHealthImage, 1360 - baseHealthImage.bitmap.width - addHealthImage.bitmap.width - 1, 97 + 70*0)
        .composite(addHealthImage, 1360 - addHealthImage.bitmap.width, 97 + 70*0)
        .composite(maxHealthImage, 1360 - maxHealthImage.bitmap.width, 67 + 70*0)
        .composite(baseAttackImage, 1360 - baseAttackImage.bitmap.width - addAttackImage.bitmap.width - 1, 97 + 70*1)
        .composite(addAttackImage, 1360 - addAttackImage.bitmap.width, 97 + 70*1)
        .composite(attackImage, 1360 - attackImage.bitmap.width, 67 + 70*1)
        .composite(baseDefenseImage, 1360 - baseDefenseImage.bitmap.width - addDefenseImage.bitmap.width - 1, 97 + 70*2)
        .composite(addDefenseImage, 1360 - addDefenseImage.bitmap.width, 97 + 70*2)
        .composite(defenseImage, 1360 - defenseImage.bitmap.width, 67 + 70*2)
        .composite(elementMasteryImage, 1360 - elementMasteryImage.bitmap.width, 67 + 70*3)
        .composite(critRateImage, 1360 - critRateImage.bitmap.width, 67 + 70*4)
        .composite(critDamageImage, 1360 - critDamageImage.bitmap.width, 67 + 70*5)
        .composite(chargeEfficiencyImage, 1360 - chargeEfficiencyImage.bitmap.width, 67 + 70*6)

    // 元素ダメージ, 治療効果
    if(characterMaxValueStatus.value > 0) {
        let maxValueStatusIcon = (await Jimp.read(path.join(emotePath, `${ characterMaxValueStatus.name }.png`)))
            .resize(40, 40)

        let maxValueStatusNameImage = await Jimp.read(
            await text2image(characterMaxValueStatus.name, {
                fontLocation: fontPath,
                fontSize: 27,
                fontColor: "#FFF"
            })
        )

        let maxValueStatusImage = await Jimp.read(
            await text2image(`${ characterMaxValueStatus.value.toFixed(1) }%`, {
                fontLocation: fontPath,
                fontSize: 26,
                fontColor: "#FFF"
            })
        )

        characterStatusPaste
            .composite(maxValueStatusIcon, 787, 62 + 70*7)
            .composite(maxValueStatusNameImage, 845, 67 + 70*7)
            .composite(maxValueStatusImage, 1360 - maxValueStatusImage.bitmap.width, 67 + 70*7)
    }

    // 聖遺物

    // 合成
    base
        .composite(characterPaste, 0, 0)
        .composite(shadow, 0, 0)
        .composite(weaponPaste, 0, 0)
        .composite(weaponRarePaste, 0, 0)
        .composite(talentBasePaste, 0, 0)
        .composite(constBasePaste, 0, 0)
        .composite(characterInfoPaste, 0, 0)
        .composite(characterStatusPaste, 0, 0)
        .write(path.join(testPath, "test.png"), (err) => {
            if(err) {
                console.log(err)
            } else {
                console.log("generated")
                exit(1)
            }
        })
}

enka.fetchUser("800282666").then(result => {
    generate(result.characters[0])
})
