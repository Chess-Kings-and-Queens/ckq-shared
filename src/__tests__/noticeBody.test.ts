import { parseNoticeBody } from '../noticeBody';

const plain = (text: string) => ({ text, bold: false });
const bold = (text: string) => ({ text, bold: true });

describe('parseNoticeBody', () => {
  it('one line is one paragraph with one line', () => {
    expect(parseNoticeBody('hello')).toEqual([{ kind: 'paragraph', lines: [[plain('hello')]] }]);
  });

  it('lines in one block stay one paragraph', () => {
    expect(parseNoticeBody('a\nb')).toEqual([
      { kind: 'paragraph', lines: [[plain('a')], [plain('b')]] },
    ]);
  });

  it.each(['a\n\nb', 'a\n  \nb'])('a blank line splits paragraphs: %j', (body) => {
    expect(parseNoticeBody(body)).toEqual([
      { kind: 'paragraph', lines: [[plain('a')]] },
      { kind: 'paragraph', lines: [[plain('b')]] },
    ]);
  });

  it.each(['', '   ', '\n\n', '\n\nhi\n\n'])('trims and drops blank blocks: %j', (body) => {
    const blocks = parseNoticeBody(body);
    if (body.trim() === '') {
      expect(blocks).toEqual([]);
    } else {
      expect(blocks).toEqual([{ kind: 'paragraph', lines: [[plain('hi')]] }]);
    }
  });

  it('a block whose every line starts "- " is a list', () => {
    expect(parseNoticeBody('- x\n- y')).toEqual([
      { kind: 'list', items: [[plain('x')], [plain('y')]] },
    ]);
  });

  it('a block with a non-bullet line is a paragraph', () => {
    expect(parseNoticeBody('- x\ny')).toEqual([
      { kind: 'paragraph', lines: [[plain('- x')], [plain('y')]] },
    ]);
  });

  it('drops the empty leading piece before a bold run', () => {
    expect(parseNoticeBody('**Monday** at 5')).toEqual([
      { kind: 'paragraph', lines: [[bold('Monday'), plain(' at 5')]] },
    ]);
  });

  it('alternates plain and bold pieces', () => {
    expect(parseNoticeBody('a **b** c **d**')).toEqual([
      { kind: 'paragraph', lines: [[plain('a '), bold('b'), plain(' c '), bold('d')]] },
    ]);
  });

  it('an unclosed ** stays plain text', () => {
    expect(parseNoticeBody('**a')).toEqual([{ kind: 'paragraph', lines: [[plain('**a')]] }]);
  });

  it('**** stays one plain piece (no empty bold piece)', () => {
    expect(parseNoticeBody('****')).toEqual([{ kind: 'paragraph', lines: [[plain('****')]] }]);
  });

  it('a markdown link is kept verbatim as plain text', () => {
    expect(parseNoticeBody('[x](https://chesskq.com)')).toEqual([
      { kind: 'paragraph', lines: [[plain('[x](https://chesskq.com)')]] },
    ]);
  });

  it('bold works inside a list item', () => {
    expect(parseNoticeBody('- **x** y')).toEqual([
      { kind: 'list', items: [[bold('x'), plain(' y')]] },
    ]);
  });

  it('parses a 2000-character body without error', () => {
    const blocks = parseNoticeBody('a'.repeat(2000));
    expect(blocks).toEqual([{ kind: 'paragraph', lines: [[plain('a'.repeat(2000))]] }]);
  });
});
