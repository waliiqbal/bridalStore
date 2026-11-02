import { replaceSectionVideos, videoRows } from './section-videos.js';

describe('videoRows', () => {
  it('numbers the videos in the order given and tidies empty fields', () => {
    const rows = videoRows('s1', [
      { videoUrl: 'https://x/a.mp4', title: '  ', linkUrl: '' },
      { videoUrl: 'https://x/b.mp4', title: ' Eid reel ', isActive: false },
    ]);
    expect(rows).toEqual([
      { sectionId: 's1', sortOrder: 0, videoUrl: 'https://x/a.mp4', title: null, posterUrl: null, linkUrl: null, isActive: true },
      { sectionId: 's1', sortOrder: 1, videoUrl: 'https://x/b.mp4', title: 'Eid reel', posterUrl: null, linkUrl: null, isActive: false },
    ]);
  });
});

describe('replaceSectionVideos', () => {
  const makeTx = () => ({ video: { deleteMany: vi.fn(), createMany: vi.fn() } });

  it('only touches the videos of that block', async () => {
    const tx = makeTx();
    await replaceSectionVideos(tx as never, 's1', [{ videoUrl: 'https://x/a.mp4' }]);
    expect(tx.video.deleteMany).toHaveBeenCalledWith({ where: { sectionId: 's1' } });
    expect(tx.video.createMany).toHaveBeenCalledTimes(1);
  });

  it('an empty list just clears the block', async () => {
    const tx = makeTx();
    await replaceSectionVideos(tx as never, 's1', []);
    expect(tx.video.createMany).not.toHaveBeenCalled();
  });
});
