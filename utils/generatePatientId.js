/**
 * Patient ID system — Instagram-style usernames
 *
 * If patient provides their own: validate format + uniqueness
 * If not provided: auto-generate from name (e.g. "jainil.jain", "jainil.jain2")
 *
 * Rules:
 * - Lowercase letters, numbers, dots, underscores only
 * - 3-30 characters
 * - Cannot start/end with dot or underscore
 * - No consecutive dots/underscores
 */

const ID_REGEX = /^[a-z0-9][a-z0-9._]{1,28}[a-z0-9]$/;
const BAD_PATTERNS = /[.]{2}|[_]{2}|[._]{2}/;

function sanitizeName(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, ".");
}

function validatePatientId(id) {
  if (!id || id.length < 3 || id.length > 30) return "Must be 3-30 characters";
  if (!ID_REGEX.test(id)) return "Only lowercase letters, numbers, dots and underscores allowed";
  if (BAD_PATTERNS.test(id)) return "No consecutive dots or underscores";
  return null; // valid
}

async function generatePatientId(PatientModel, name, requestedId) {
  // If patient requested a specific ID, validate and check uniqueness
  if (requestedId) {
    const cleaned = requestedId.toLowerCase().trim();
    const error = validatePatientId(cleaned);
    if (error) return { id: null, error };

    const exists = await PatientModel.findOne({ patient_id: cleaned });
    if (exists) return { id: null, error: "This ID is already taken" };

    return { id: cleaned, error: null };
  }

  // Auto-generate from name
  if (!name) name = "patient";
  const base = sanitizeName(name);

  // Try: jainil.jain, jainil.jain1, jainil.jain2, etc.
  let id = base;
  let counter = 0;
  let attempts = 0;

  while (attempts < 20) {
    const candidate = counter === 0 ? id : `${id}${counter}`;

    // Ensure valid format
    if (candidate.length >= 3 && candidate.length <= 30 && !BAD_PATTERNS.test(candidate)) {
      const exists = await PatientModel.findOne({ patient_id: candidate });
      if (!exists) return { id: candidate, error: null };
    }

    counter++;
    attempts++;
  }

  // Fallback: name + random digits
  const fallback = `${base}.${Math.floor(1000 + Math.random() * 9000)}`;
  return { id: fallback, error: null };
}

// Export for checking availability without creating
async function checkPatientIdAvailability(PatientModel, id) {
  if (!id) return { available: false, error: "ID is required" };
  const cleaned = id.toLowerCase().trim();
  const validationError = validatePatientId(cleaned);
  if (validationError) return { available: false, error: validationError };

  const exists = await PatientModel.findOne({ patient_id: cleaned });
  return { available: !exists, error: exists ? "Already taken" : null };
}

module.exports = generatePatientId;
module.exports.validatePatientId = validatePatientId;
module.exports.checkPatientIdAvailability = checkPatientIdAvailability;
