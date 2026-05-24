import {expect, test} from 'bun:test'

import {decodeBase85} from '#src/lib/base85Decode.ts'
import {encodeBase85} from '#src/lib/base85Encode.ts'

test('encodeBase85 handles known short groups', () => {
  expect(encodeBase85(new Uint8Array([]))).toBe('')
  expect(encodeBase85(new Uint8Array([0]))).toBe('!!')
  expect(encodeBase85(new Uint8Array([0, 0]))).toBe('!!!')
  expect(encodeBase85(new Uint8Array([0, 0, 0]))).toBe('!!!!')
  expect(encodeBase85(new Uint8Array([0, 0, 0, 0]))).toBe('z')
  expect(encodeBase85(new Uint8Array([0, 0, 0, 1]))).toBe('!!!!"')
})
test('decodeBase85 decodes known short groups', () => {
  expect([...decodeBase85('')]).toEqual([])
  expect([...decodeBase85('!!')]).toEqual([0])
  expect([...decodeBase85('!!!')]).toEqual([0, 0])
  expect([...decodeBase85('!!!!')]).toEqual([0, 0, 0])
  expect([...decodeBase85('z')]).toEqual([0, 0, 0, 0])
  expect([...decodeBase85('!!!!"')]).toEqual([0, 0, 0, 1])
})
test('ASCII85 round-trips representative binary payloads', () => {
  const fixtures = [
    new Uint8Array([1, 2, 3, 4, 5, 6, 7]),
    new Uint8Array([255, 254, 253, 252, 251, 250, 0, 0, 0, 0]),
    new Uint8Array(Array.from({length: 257}, (_, index) => index % 256)),
  ]
  for (const fixture of fixtures) {
    expect(decodeBase85(encodeBase85(fixture))).toEqual(fixture)
  }
})
test('decodeBase85 rejects malformed groups', () => {
  expect(() => decodeBase85('!')).toThrow('trailing group must contain at least 2 characters')
  expect(() => decodeBase85('!z')).toThrow('may only appear at the start of a group')
})
