from enum import Enum
from typing import Optional


class ThreatType(str, Enum):
    Deforestation = "Deforestation"
    Wildfire = "Wildfire"
    Poaching = "Poaching"


class DetectedSound(str, Enum):
    Chainsaw = "Chainsaw"
    Mechanical_Saw = "Mechanical Saw"
    Falling_Timber = "Falling Timber"
    Heavy_Machinery = "Heavy Machinery"
    Fire_Crackle = "Fire Crackle"
    Fire_Flare_up = "Fire Flare-up"
    Explosive_Burn = "Explosive Burn"
    Gunshot = "Gunshot"
    Rifle_Crack = "Rifle Crack"
    Animal_Distress_Call = "Animal Distress Call"
    Metallic_Trap_Snap = "Metallic Trap Snap"
    Human_Shouting = "Human Shouting"


THREAT_CLASSES = {
    "chainsaw": {"threat_type": ThreatType.Deforestation, "sound": DetectedSound.Chainsaw, "priority": 3},
    "mechanical_saw": {"threat_type": ThreatType.Deforestation, "sound": DetectedSound.Mechanical_Saw, "priority": 3},
    "falling_timber": {"threat_type": ThreatType.Deforestation, "sound": DetectedSound.Falling_Timber, "priority": 3},
    "heavy_machinery": {"threat_type": ThreatType.Deforestation, "sound": DetectedSound.Heavy_Machinery, "priority": 2},
    "fire_crackle": {"threat_type": ThreatType.Wildfire, "sound": DetectedSound.Fire_Crackle, "priority": 3},
    "fire_flare_up": {"threat_type": ThreatType.Wildfire, "sound": DetectedSound.Fire_Flare_up, "priority": 3},
    "explosive_burn": {"threat_type": ThreatType.Wildfire, "sound": DetectedSound.Explosive_Burn, "priority": 3},
    "gunshot": {"threat_type": ThreatType.Poaching, "sound": DetectedSound.Gunshot, "priority": 3},
    "rifle_crack": {"threat_type": ThreatType.Poaching, "sound": DetectedSound.Rifle_Crack, "priority": 3},
    "animal_distress": {"threat_type": ThreatType.Poaching, "sound": DetectedSound.Animal_Distress_Call, "priority": 2},
    "trap_snap": {"threat_type": ThreatType.Poaching, "sound": DetectedSound.Metallic_Trap_Snap, "priority": 3},
    "human_shouting": {"threat_type": ThreatType.Poaching, "sound": DetectedSound.Human_Shouting, "priority": 2},
}

AMBIENT_CLASSES = {
    "bird_chirp",
    "insect_hum",
    "cicada",
    "cricket",
    "mating_call",
    "wind_moderate",
    "rain_light",
    "rain_heavy",
    "thunder_normal",
    "river_flow",
    "rustling_leaves",
    "twig_break",
    "animal_movement",
    "ambient",
}

ACTION_MAP = {
    ThreatType.Deforestation: "Immediate dispatch",
    ThreatType.Wildfire: "Immediate dispatch",
    ThreatType.Poaching: "Immediate dispatch",
}
