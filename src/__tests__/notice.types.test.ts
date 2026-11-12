import type { NoticeFeedResponse, PortalNotice } from '../types/notice';

describe('notice types', () => {
  it('NoticeFeedResponse carries a popup with no action and a banner with an action', () => {
    const feed: NoticeFeedResponse = {
      notices: [
        {
          _id: 'n1',
          title: 'Trail scoring is changing',
          body: 'From **Monday**, OTB games count.',
          style: 'popup',
          action: null,
          startAt: '2026-11-10T12:00:00.000Z',
        },
        {
          _id: 'n2',
          title: 'New Trail page',
          body: 'Take a look.',
          style: 'banner',
          action: { label: 'Open Trail', href: '/portal/trail' },
          startAt: '2026-11-10T12:00:00.000Z',
        },
      ],
    };
    expect(feed.notices).toHaveLength(2);
    expect(feed.notices[1].action?.href).toBe('/portal/trail');
  });

  it('rejects an unknown style and a missing action at compile time', () => {
    const badStyle: PortalNotice = {
      _id: 'n3',
      title: 't',
      body: 'b',
      // @ts-expect-error style is "popup" | "banner"
      style: 'toast',
      action: null,
      startAt: '2026-11-10T12:00:00.000Z',
    };
    // @ts-expect-error action is required (it may be null)
    const noAction: PortalNotice = {
      _id: 'n4',
      title: 't',
      body: 'b',
      style: 'popup',
      startAt: '2026-11-10T12:00:00.000Z',
    };
    expect([badStyle, noAction]).toHaveLength(2);
  });
});
