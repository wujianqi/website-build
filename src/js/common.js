import LazyLoad from 'lazyload';

new LazyLoad(document.querySelectorAll('img'), {
  root: null,
  rootMargin: "0px",
  threshold: 0
});
