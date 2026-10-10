import { describe, expect, it } from 'vitest';
import { LABEL_TEXT } from '../src/core/labels';

describe('scaffold', () => {
  it('has exactly four evidence labels', () => {
    expect(Object.keys(LABEL_TEXT)).toEqual(['calculated', 'traditional', 'synthesis', 'disagreement']);
  });
});
