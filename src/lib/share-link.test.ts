import { describe, expect, it } from 'vitest'
import { shareAddressForLookup } from './share-link'

describe('shareAddressForLookup', () => {
  it('cuts an encrypted share’s key before the address is sent', () => {
    expect(shareAddressForLookup(' https://plainmote.link/d/AbC123/file.txt#k=s3cr3t-key \n')).toEqual({
      address: 'https://plainmote.link/d/AbC123/file.txt',
      droppedFragment: true,
    })
    expect(shareAddressForLookup('AbC123#')).toEqual({ address: 'AbC123', droppedFragment: true })
    expect(shareAddressForLookup('#k=only-a-key').address).toBe('')
  })

  it('leaves an address without a fragment as it is', () => {
    expect(shareAddressForLookup('https://plainmote.link/d/AbC123')).toEqual({
      address: 'https://plainmote.link/d/AbC123',
      droppedFragment: false,
    })
  })
})
