export const mockRoutineResponse = {
  reply:
    'Bruising more than usual can sometimes happen with blood-thinning medicines like warfarin. This is not a diagnosis — it may or may not be related.',
  possibleRelatedMedication: 'Warfarin',
  urgency: 'routine',
  recommendation: 'Please mention this to your doctor or pharmacist at your next visit.',
  isUncertain: false,
  uncertaintyReason: null,
  disclaimer:
    'This is general information, not medical advice. Always confirm with a healthcare professional.',
}

export const mockEmergencyResponse = {
  reply:
    'Chest pain or tightness can be a medical emergency, especially when taking blood-thinning medication. Do not wait to see if it passes.',
  possibleRelatedMedication: null,
  urgency: 'emergency',
  recommendation:
    'Call emergency services (112 / 119) or go to the nearest emergency room immediately.',
  isUncertain: false,
  uncertaintyReason: null,
  disclaimer:
    'This is general information, not medical advice. Always confirm with a healthcare professional.',
}

export const mockUncertainResponse = {
  reply:
    "I'm not sure whether this symptom is related to any of your medicines. It could have many causes.",
  possibleRelatedMedication: null,
  urgency: 'uncertain',
  recommendation: 'Please see your doctor or pharmacist to discuss this.',
  isUncertain: true,
  uncertaintyReason:
    'The described symptom is too general to assess against the medication list.',
  disclaimer:
    'This is general information, not medical advice. Always confirm with a healthcare professional.',
}

// Rotation order for the demo: routine → emergency → uncertain → repeat.
export const mockRotation = [
  mockRoutineResponse,
  mockEmergencyResponse,
  mockUncertainResponse,
]
