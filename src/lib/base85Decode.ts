const ascii85Base = 85
const inputGroupCharacterCount = 5
const outputGroupByteCount = 4
const paddingDigit = ascii85Base - 1
const whitespaceCharacterCodes = new Set([9, 10, 11, 12, 13, 32])
const zeroGroupShortcut = 'z'.codePointAt(0)!
const lowestDigitCharacterCode = '!'.codePointAt(0)!
const highestDigitCharacterCode = 'u'.codePointAt(0)!
const isWhitespaceCharacterCode = (characterCode: number) => {
  return whitespaceCharacterCodes.has(characterCode)
}
const isDigitCharacterCode = (characterCode: number) => {
  return characterCode >= lowestDigitCharacterCode && characterCode <= highestDigitCharacterCode
}
const toOutputByteCount = (value: string) => {
  let outputByteCount = 0
  let groupedCharacterCount = 0
  for (let index = 0; index < value.length; index++) {
    const characterCode = value.codePointAt(index)!
    if (isWhitespaceCharacterCode(characterCode)) {
      continue
    }
    if (characterCode === zeroGroupShortcut) {
      if (groupedCharacterCount !== 0) {
        throw new Error('Invalid ASCII85 payload: “z” may only appear at the start of a group.')
      }
      outputByteCount += outputGroupByteCount
      continue
    }
    if (!isDigitCharacterCode(characterCode)) {
      throw new Error(`Invalid ASCII85 payload: unexpected character ${JSON.stringify(value[index])}.`)
    }
    groupedCharacterCount++
    if (groupedCharacterCount === inputGroupCharacterCount) {
      outputByteCount += outputGroupByteCount
      groupedCharacterCount = 0
    }
  }
  if (groupedCharacterCount === 1) {
    throw new Error('Invalid ASCII85 payload: trailing group must contain at least 2 characters.')
  }
  if (groupedCharacterCount > 1) {
    outputByteCount += groupedCharacterCount - 1
  }
  return outputByteCount
}
const writeOutputGroup = (output: Uint8Array, outputOffset: number, groupedValue: number, writtenByteCount = outputGroupByteCount) => {
  if (writtenByteCount >= 1) {
    output[outputOffset] = groupedValue >>> 24
  }
  if (writtenByteCount >= 2) {
    output[outputOffset + 1] = groupedValue >>> 16 & 0xFF
  }
  if (writtenByteCount >= 3) {
    output[outputOffset + 2] = groupedValue >>> 8 & 0xFF
  }
  if (writtenByteCount >= 4) {
    output[outputOffset + 3] = groupedValue & 0xFF
  }
}

export const decodeBase85 = (value: string) => {
  const output = new Uint8Array(toOutputByteCount(value))
  let groupedCharacterCount = 0
  let groupedValue = 0
  let outputOffset = 0
  for (let index = 0; index < value.length; index++) {
    const characterCode = value.codePointAt(index)!
    if (isWhitespaceCharacterCode(characterCode)) {
      continue
    }
    if (characterCode === zeroGroupShortcut) {
      writeOutputGroup(output, outputOffset, 0)
      outputOffset += outputGroupByteCount
      continue
    }
    groupedValue = groupedValue * ascii85Base + characterCode - lowestDigitCharacterCode
    groupedCharacterCount++
    if (groupedCharacterCount === inputGroupCharacterCount) {
      writeOutputGroup(output, outputOffset, groupedValue)
      outputOffset += outputGroupByteCount
      groupedCharacterCount = 0
      groupedValue = 0
    }
  }
  if (groupedCharacterCount > 1) {
    for (let index = groupedCharacterCount; index < inputGroupCharacterCount; index++) {
      groupedValue = groupedValue * ascii85Base + paddingDigit
    }
    writeOutputGroup(output, outputOffset, groupedValue, groupedCharacterCount - 1)
  }
  return output
}

export default decodeBase85
