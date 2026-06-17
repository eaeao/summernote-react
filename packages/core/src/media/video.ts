/**
 * createVideoNode — ported 1:1 from VideoDialog.createVideoNode (jQuery element building replaced
 * with native createElement). Parses a video URL for every supported provider and returns the
 * embed node (iframe/video) with the .note-video-clip class, or null when the URL is unknown.
 */
function el(tag: string, attrs: Record<string, string>): HTMLElement {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    node.setAttribute(k, v);
  }
  return node;
}

export function createVideoNode(url: string): HTMLElement | null {
  const ytRegExp =
    /(?:youtu\.be\/|youtube\.com\/(?:[^/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=|shorts\/|live\/))([^&\n?]+)(?:.*[?&]t=([^&\n]+))?.*/;
  const ytRegExpForStart = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/;
  const ytMatch = url.match(ytRegExp);

  const gdRegExp = /(?:\.|\/\/)drive\.google\.com\/file\/d\/(.[a-zA-Z0-9_-]*)\/view/;
  const gdMatch = url.match(gdRegExp);

  const igRegExp = /(?:www\.|\/\/)instagram\.com\/(reel|p)\/(.[a-zA-Z0-9_-]*)/;
  const igMatch = url.match(igRegExp);

  const vRegExp = /\/\/vine\.co\/v\/([a-zA-Z0-9]+)/;
  const vMatch = url.match(vRegExp);

  const vimRegExp = /\/\/(player\.)?vimeo\.com\/([a-z]*\/)*(\d+)[?]?.*/;
  const vimMatch = url.match(vimRegExp);

  const dmRegExp = /.+dailymotion.com\/(video|hub)\/([^_]+)[^#]*(#video=([^_&]+))?/;
  const dmMatch = url.match(dmRegExp);

  const youkuRegExp = /\/\/v\.youku\.com\/v_show\/id_(\w+)=*\.html/;
  const youkuMatch = url.match(youkuRegExp);

  const peerTubeRegExp =
    /\/\/(.*)\/videos\/watch\/([^?]*)(?:\?(?:start=(\w*))?(?:&stop=(\w*))?(?:&loop=([10]))?(?:&autoplay=([10]))?(?:&muted=([10]))?)?/;
  const peerTubeMatch = url.match(peerTubeRegExp);

  const qqRegExp = /\/\/v\.qq\.com.*?vid=(.+)/;
  const qqMatch = url.match(qqRegExp);

  const qqRegExp2 = /\/\/v\.qq\.com\/x?\/?(page|cover).*?\/([^/]+)\.html\??.*/;
  const qqMatch2 = url.match(qqRegExp2);

  const mp4RegExp = /^.+.(mp4|m4v)$/;
  const mp4Match = url.match(mp4RegExp);

  const oggRegExp = /^.+.(ogg|ogv)$/;
  const oggMatch = url.match(oggRegExp);

  const webmRegExp = /^.+.(webm)$/;
  const webmMatch = url.match(webmRegExp);

  const fbRegExp = /(?:www\.|\/\/)facebook\.com\/([^/]+)\/videos\/([0-9]+)/;
  const fbMatch = url.match(fbRegExp);

  let video: HTMLElement | null = null;
  if (ytMatch && ytMatch[1] && ytMatch[1].length === 11) {
    const youtubeId = ytMatch[1];
    let start = 0;
    if (typeof ytMatch[2] !== 'undefined') {
      const ytMatchForStart = ytMatch[2].match(ytRegExpForStart);
      if (ytMatchForStart) {
        for (let n = [3600, 60, 1], i = 0, r = n.length; i < r; i++) {
          start += typeof ytMatchForStart[i + 1] !== 'undefined' ? n[i]! * parseInt(ytMatchForStart[i + 1]!, 10) : 0;
        }
      } else {
        start = parseInt(ytMatch[2], 10);
      }
    }
    video = el('iframe', {
      frameborder: '0',
      src: '//www.youtube.com/embed/' + youtubeId + (start > 0 ? '?start=' + start : ''),
      width: '640',
      height: '360',
    });
  } else if (gdMatch && gdMatch[0].length) {
    video = el('iframe', {
      frameborder: '0',
      src: 'https://drive.google.com/file/d/' + gdMatch[1] + '/preview',
      width: '640',
      height: '480',
    });
  } else if (igMatch && igMatch[0].length) {
    video = el('iframe', {
      frameborder: '0',
      src: 'https://instagram.com/p/' + igMatch[2] + '/embed/',
      width: '612',
      height: '710',
      scrolling: 'no',
      allowtransparency: 'true',
    });
  } else if (vMatch && vMatch[0].length) {
    video = el('iframe', {
      frameborder: '0',
      src: vMatch[0] + '/embed/simple',
      width: '600',
      height: '600',
      class: 'vine-embed',
    });
  } else if (vimMatch && vimMatch[3] && vimMatch[3].length) {
    video = el('iframe', {
      webkitallowfullscreen: '',
      mozallowfullscreen: '',
      allowfullscreen: '',
      frameborder: '0',
      src: '//player.vimeo.com/video/' + vimMatch[3],
      width: '640',
      height: '360',
    });
  } else if (dmMatch && dmMatch[2] && dmMatch[2].length) {
    video = el('iframe', {
      frameborder: '0',
      src: '//www.dailymotion.com/embed/video/' + dmMatch[2],
      width: '640',
      height: '360',
    });
  } else if (youkuMatch && youkuMatch[1] && youkuMatch[1].length) {
    video = el('iframe', {
      webkitallowfullscreen: '',
      mozallowfullscreen: '',
      allowfullscreen: '',
      frameborder: '0',
      height: '498',
      width: '510',
      src: '//player.youku.com/embed/' + youkuMatch[1],
    });
  } else if (peerTubeMatch && peerTubeMatch[0].length) {
    const begin = typeof peerTubeMatch[3] !== 'undefined' ? Number(peerTubeMatch[3]) : 0;
    const end = typeof peerTubeMatch[4] !== 'undefined' ? Number(peerTubeMatch[4]) : 0;
    const loop = typeof peerTubeMatch[5] !== 'undefined' ? peerTubeMatch[5] : 0;
    const autoplay = typeof peerTubeMatch[6] !== 'undefined' ? peerTubeMatch[6] : 0;
    const muted = typeof peerTubeMatch[7] !== 'undefined' ? peerTubeMatch[7] : 0;
    video = el('iframe', {
      allowfullscreen: '',
      sandbox: 'allow-same-origin allow-scripts allow-popups',
      frameborder: '0',
      src:
        '//' +
        peerTubeMatch[1] +
        '/videos/embed/' +
        peerTubeMatch[2] +
        '?loop=' +
        loop +
        '&autoplay=' +
        autoplay +
        '&muted=' +
        muted +
        (begin > 0 ? '&start=' + begin : '') +
        (end > 0 ? '&end=' + end : ''),
      width: '560',
      height: '315',
    });
  } else if ((qqMatch && qqMatch[1].length) || (qqMatch2 && qqMatch2[2] && qqMatch2[2].length)) {
    const vid = qqMatch && qqMatch[1].length ? qqMatch[1] : qqMatch2![2]!;
    video = el('iframe', {
      webkitallowfullscreen: '',
      mozallowfullscreen: '',
      allowfullscreen: '',
      frameborder: '0',
      height: '310',
      width: '500',
      src: 'https://v.qq.com/txp/iframe/player.html?vid=' + vid + '&amp;auto=0',
    });
  } else if (mp4Match || oggMatch || webmMatch) {
    video = el('video', { controls: '', src: url, width: '640', height: '360' });
  } else if (fbMatch && fbMatch[0].length) {
    video = el('iframe', {
      frameborder: '0',
      src: 'https://www.facebook.com/plugins/video.php?href=' + encodeURIComponent(fbMatch[0]) + '&show_text=0&width=560',
      width: '560',
      height: '301',
      scrolling: 'no',
      allowtransparency: 'true',
    });
  } else {
    return null;
  }

  video.classList.add('note-video-clip');
  return video;
}
