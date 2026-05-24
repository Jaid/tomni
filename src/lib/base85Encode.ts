const ascii85Base = 85
const inputGroupByteCount = 4
const outputGroupCharacterCount = 5
const zeroGroupShortcut = 'z'
const zeroCharacterCode = '!'.codePointAt(0)!
const encodeGroup = (value: number) => {
  const characters = Array.from({length: outputGroupCharacterCount})
  let remaining = value
  for (let index = outputGroupCharacterCount - 1; index >= 0; index--) {
    characters[index] = String.fromCodePoint(zeroCharacterCode + remaining % ascii85Base)
    remaining = Math.floor(remaining / ascii85Base)
  }
  return characters.join('')
}

export const encodeBase85 = (value: Uint8Array) => {
  const parts: Array<string> = []
  for (let offset = 0; offset < value.length; offset += inputGroupByteCount) {
    const remainingByteCount = Math.min(inputGroupByteCount, value.length - offset)
    let groupedValue = 0
    for (let index = 0; index < inputGroupByteCount; index++) {
      groupedValue *= 256
      groupedValue += value[offset + index] ?? 0
    }
    if (remainingByteCount === inputGroupByteCount && groupedValue === 0) {
      parts.push(zeroGroupShortcut)
      continue
    }
    parts.push(encodeGroup(groupedValue).slice(0, remainingByteCount + 1))
  }
  return parts.join('')
}

export default encodeBase85
