import QR from 'qrcode'
import { describe, expect, it } from 'vitest'
import { makeQr } from './qr.js'

describe('qr.js', () => {
  it('matches a reference encoder module for module, for every version and mask', () => {
    for (const len of [1, 14, 20, 26, 35, 42, 60, 62, 84, 100, 106, 122, 140, 154, 180, 213]) {
      const text = 'https://play.example/j/ABCD?x='.padEnd(len, 'z').slice(0, len)
      for (let mask = 0; mask < 8; mask++) {
        const ref = QR.create(text, { errorCorrectionLevel: 'M', maskPattern: mask })
        const mine = makeQr(text, mask)
        expect([len, mask, mine.size]).toEqual([len, mask, ref.modules.size])
        let diff = 0
        for (let y = 0; y < mine.size; y++) for (let x = 0; x < mine.size; x++) if (!!ref.modules.get(y, x) !== mine.dark(x, y)) diff++
        expect([len, mask, diff]).toEqual([len, mask, 0])
      }
    }
  })

  it('picks a mask by itself and refuses text that is too long', () => {
    expect(makeQr('http://192.168.1.20:5174/j/ABCD').version).toBe(3)
    expect(() => makeQr('x'.repeat(300))).toThrow()
  })
})
