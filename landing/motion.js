// 진입 모션 + 카운트업. 정지 상태에서 이미 읽히는 화면이어야 하므로
// 관찰 실패 시에도 .in 을 붙여 콘텐츠가 반드시 보이게 한다.
(function () {
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var items = document.querySelectorAll('[data-motion]');
  document.querySelectorAll('[data-stagger]').forEach(function (p) {
    Array.prototype.forEach.call(p.children, function (c, i) { c.style.setProperty('--i', i); });
  });
  function countUp(el) {
    var to = parseFloat(el.dataset.count) || 0, t0 = null, dur = 1200;
    if (reduce) { el.textContent = to.toLocaleString('ko-KR'); return; }
    requestAnimationFrame(function step(t) {
      if (!t0) t0 = t;
      var k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      el.textContent = Math.round(to * e).toLocaleString('ko-KR');
      if (k < 1) requestAnimationFrame(step);
    });
  }
  if (!('IntersectionObserver' in window) || reduce) {
    items.forEach(function (el) { el.classList.add('in'); });
    document.querySelectorAll('[data-count]').forEach(countUp);
    return;
  }
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      // 교차 영역이 0 으로 보고돼도(클립·마스크·height 0) 뷰포트 안이면 드러낸다
      var r = e.boundingClientRect, vh = innerHeight || 0, vw = innerWidth || 0;
      if (!e.isIntersecting &&
          !(r.bottom > 0 && r.top < vh && r.right > 0 && r.left < vw)) return;
      e.target.classList.add('in');
      e.target.querySelectorAll('[data-count]').forEach(countUp);
      if (e.target.matches('[data-count]')) countUp(e.target);
      io.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.1 });
  items.forEach(function (el) { io.observe(el); });
})();
