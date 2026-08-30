import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

// Data mapping nama skill ke singkatan resmi
const SKILL_MAP: Record<string, string> = {
  "Ancient Gear Engineering": "AGE",
  "B.E.S Rush": "BESR",
  "Barian Battlemorph! Galaxy-Eyes": "BB!GE",
  "Barian Battlemorph! Leader of the Seven": "BB!LotS",
  "Barian Battlemorph! Shooting Star Fist": "BB!SSF",
  "Barian Battlemorph! The Barian's White Shield": "BB!TBWS",
  "Barian's Chaos Draw": "BCD",
  "Beasts from the Abyss": "BftA",
  "Beetrooper Raid": "BR",
  "Bonds of the Converging Stars": "BotCS",
  "Chimera Illusion": "CI",
  "Crystal Clear Wing Acceleration": "CCWA",
  "Cynet Extended": "CE",
  "D/D Secondment": "D/D-S",
  "Dark Stirring of the Dreadful Dolls": "DSotDD",
  "Destiny Draw Leading to Dragon Master Knight": "DDLtDMK",
  "Destiny Draw: Humanity's Trump Card": "DD:HTC",
  "Destiny Draw: Vermillion Sparrow": "DD:VS",
  "Dino Awakening": "DA",
  "Doom Ushering Gale": "DUG",
  "Dragonic Contact": "DC",
  "Dyson Sphere Gravity": "DSG",
  "Eyes of Sovereign Defiance": "EoSD",
  "Fiendish Gourmet Recipe": "FGR",
  "Hero's Awakening": "HA",
  "Hope-Filled Chronomaly": "HFC",
  "Hyper Cannon Activation": "HCA",
  "Icejade Ripple": "IcRi",
  "Indestructible Spright": "IS",
  "Infernity Revival": "IR",
  "Intertwining Memories": "IM",
  "Invicible Crimson Star": "ICS",
  "Maid's Downtime": "MD",
  "Makyura's Judgement": "MJ",
  "Master of Blue-Eyes": "MoBE",
  "Might of the True World": "MotTW",
  "Mikanko's Grand Stage": "MGS",
  "Number Galaxy": "NG",
  "Power Engraved in Ancient Memories": "PEiAM",
  "Precious Cards of the Dark": "PCotD",
  "Precious Cards of the Light": "PCotL",
  "Precious Cards of the Water": "PCotWA",
  "Precious Cards of the Wind": "PCotWI",
  "Predaprime Invasion": "PI",
  "Princess Adena's Protection": "PAP",
  "Raider's Rebellion": "RReb",
  "Raider's Revolution": "RRev",
  "Reign of Shadows": "RoS",
  "Revolution des Fleurs": "RdF",
  "Sanctuary of the King's Treasures": "SotKT",
  "Sky Striker Ace Defying Fate": "SSADF",
  "Starlight Drive": "SD",
  "Starry Slumbering Memories": "SSM",
  "Starving Venom Invasion": "SVI",
  "Sun God's Flare": "SGF",
  "The Courage to Rise": "TCtR",
  "The Eye of the United Dragon": "TEotUD",
  "The Power of All Creation": "TPoAC",
  "The Power of D: Weaving the Future": "TPoD:WtF",
  "The Stirring Mayakashi": "TSM",
  "The Unsealed Forbidden Door": "TUFD",
  "Therion Battle Royale": "TBR",
  "Traptrix Territory": "TT",
  "Tri-Brigade Trigger": "TBT",
  "Whispers of Good and Evil": "WoGaE",
  "Wings to the Heavens": "WttH",
  "ZEXAL II - Power the Future": "ZII - PtF",
};

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    // Proteksi sederhana agar tidak sembarang dipicu
    if (token !== process.env.ADMIN_SECRET && token !== 'twi-migrate') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Ambil data lama jika ada untuk digabungkan
    const existingRaw = await kv.get<any>('twi:master_skills');
    let existingMap: Record<string, string> = {};

    if (existingRaw) {
      if (Array.isArray(existingRaw)) {
        // Jika sebelumnya berbentuk array string biasa, konversi ke map
        existingRaw.forEach((skill: string) => {
          existingMap[skill] = SKILL_MAP[skill] || skill;
        });
      } else if (typeof existingRaw === 'object') {
        existingMap = existingRaw;
      }
    }

    // Merge dengan dictionary baru
    const finalData = { ...existingMap, ...SKILL_MAP };

    // Simpan ke KV
    await kv.set('twi:master_skills', finalData);

    return NextResponse.json({
      success: true,
      message: 'Migrasi master skills berhasil disimpan.',
      totalSkills: Object.keys(finalData).length,
      sample: Object.entries(finalData).slice(0, 5),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
  
