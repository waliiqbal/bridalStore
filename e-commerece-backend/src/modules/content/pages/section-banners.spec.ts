import { bannerRows, replaceSectionBanners } from './section-banners.js';

describe('bannerRows', () => {
  it('numbers the banners in the order given and tidies empty fields', () => {
    const rows = bannerRows('s1', [
      { imageUrl: 'https://x/a.webp', title: '  ', buttonText: '' },
      { imageUrl: 'https://x/b.webp', title: ' Eid Sale ', isActive: false, mobileImageUrl: 'https://x/b-phone.webp' },
    ]);
    expect(rows).toEqual([
      { sectionId: 's1', sortOrder: 0, imageUrl: 'https://x/a.webp', title: null, subtitle: null, mobileImageUrl: null, linkUrl: null, buttonText: null, isActive: true },
      { sectionId: 's1', sortOrder: 1, imageUrl: 'https://x/b.webp', title: 'Eid Sale', subtitle: null, mobileImageUrl: 'https://x/b-phone.webp', linkUrl: null, buttonText: null, isActive: false },
    ]);
  });
});

describe('replaceSectionBanners', () => {
  const makeTx = () => ({ promoBanner: { deleteMany: vi.fn(), createMany: vi.fn() } });

  it('only touches the banners of that block', async () => {
    const tx = makeTx();
    await replaceSectionBanners(tx as never, 's1', [{ imageUrl: 'https://x/a.webp' }]);
    expect(tx.promoBanner.deleteMany).toHaveBeenCalledWith({ where: { sectionId: 's1' } });
    expect(tx.promoBanner.createMany).toHaveBeenCalledTimes(1);
  });

  it('an empty list just clears the block', async () => {
    const tx = makeTx();
    await replaceSectionBanners(tx as never, 's1', []);
    expect(tx.promoBanner.createMany).not.toHaveBeenCalled();
  });
});
