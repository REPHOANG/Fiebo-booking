const LOCK_KEY = "__fieboBodyScrollLockState__";

const getState = () => {
  if (typeof window === "undefined") return null;
  if (!window[LOCK_KEY]) {
    window[LOCK_KEY] = {
      count: 0,
      prevOverflow: "",
      prevPaddingRight: "",
      gapApplied: false,
    };
  }
  return window[LOCK_KEY];
};

export const lockBodyScroll = (options = {}) => {
  if (typeof document === "undefined") return;
  const state = getState();
  if (!state) return;

  if (state.count === 0) {
    state.prevOverflow = document.body.style.overflow || "";
    state.prevPaddingRight = document.body.style.paddingRight || "";
    state.gapApplied = false;

    if (options.reserveScrollbarGap) {
      const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
      if (scrollBarWidth > 0) {
        document.body.style.paddingRight = `${scrollBarWidth}px`;
        state.gapApplied = true;
      }
    }

    document.body.style.overflow = "hidden";
  }

  state.count += 1;
};

export const unlockBodyScroll = () => {
  if (typeof document === "undefined") return;
  const state = getState();
  if (!state || state.count <= 0) return;

  state.count -= 1;
  if (state.count > 0) return;

  document.body.style.overflow = state.prevOverflow || "";
  document.body.style.paddingRight = state.gapApplied ? state.prevPaddingRight || "" : document.body.style.paddingRight;
  state.prevOverflow = "";
  state.prevPaddingRight = "";
  state.gapApplied = false;
};
