// components/accordion/accordion.js
(function () {
  "use strict";

  // Mirrors Base UI's accordion: aria-expanded on the trigger is the single
  // source of truth, panels animate between 0 and their measured height.

  function triggerOf(item) {
    return item.querySelector('[data-slot="accordion-trigger"]');
  }

  function panelOf(item) {
    return item.querySelector('[data-slot="accordion-content"]');
  }

  function valueOf(item) {
    return item.getAttribute("data-tui-accordion-value") || "";
  }

  function valuesOf(accordion) {
    return [...accordion.querySelectorAll('[data-slot="accordion-item"]')]
      .filter(
        (item) =>
          item.closest('[data-slot="accordion"]') === accordion &&
          triggerOf(item)?.getAttribute("aria-expanded") === "true",
      )
      .map(valueOf);
  }

  function syncItemState(item, open) {
    item.toggleAttribute("data-open", open);
    item.toggleAttribute("data-closed", !open);
  }

  function openItem(item) {
    const panel = panelOf(item);
    triggerOf(item).setAttribute("aria-expanded", "true");
  syncItemState(item, true);
    if (!panel) return;
    triggerOf(item).setAttribute("aria-controls", panel.id);
    panel.removeAttribute("data-closed");
    panel.hidden = false;
    panel.style.setProperty("--tui-accordion-panel-height", panel.scrollHeight + "px");
    panel.setAttribute("data-open", "");
  }

  function closeItem(item) {
    const panel = panelOf(item);
    triggerOf(item).setAttribute("aria-expanded", "false");
    triggerOf(item).removeAttribute("aria-controls");
  syncItemState(item, false);
    if (!panel) return;
    panel.removeAttribute("data-open");
    panel.style.setProperty("--tui-accordion-panel-height", panel.scrollHeight + "px");
    panel.setAttribute("data-closed", "");
    panel.addEventListener(
      "animationend",
      () => {
        if (panel.hasAttribute("data-closed")) {
          panel.removeAttribute("data-closed");
          panel.hidden = true;
        }
      },
      { once: true }
    );
  }

  function requestValueChange(accordion, item) {
    const open = triggerOf(item).getAttribute("aria-expanded") === "true";
    let values = valuesOf(accordion);
    if (open) {
      values = values.filter((value) => value !== valueOf(item));
    } else if (accordion.hasAttribute("data-multiple")) {
      values = [...values, valueOf(item)];
    } else {
      values = [valueOf(item)];
    }
    const change = new CustomEvent("accordion-value-change", {
      bubbles: true,
      cancelable: true,
      detail: { values },
    });
    const accepted = accordion.dispatchEvent(change);
    return accepted && !accordion.hasAttribute("data-tui-accordion-controlled");
  }

  document.addEventListener("click", (e) => {
    if (!(e.target instanceof Element)) return;
    const trigger = e.target.closest('[data-slot="accordion-trigger"]');
    if (!trigger) return;
    const item = trigger.closest('[data-slot="accordion-item"]');
    const accordion = trigger.closest('[data-slot="accordion"]');
  if (
    !item ||
    !accordion ||
    item.hasAttribute("data-disabled") ||
    accordion.hasAttribute("data-disabled") ||
    !requestValueChange(accordion, item)
  ) return;

    if (trigger.getAttribute("aria-expanded") === "true") {
      closeItem(item);
      return;
    }
  if (!accordion.hasAttribute("data-multiple")) {
      accordion.querySelectorAll('[data-slot="accordion-item"]').forEach((other) => {
        if (other === item) return;
        if (other.closest('[data-slot="accordion"]') !== accordion) return;
        if (triggerOf(other)?.getAttribute("aria-expanded") === "true") closeItem(other);
      });
    }
    openItem(item);
  });

  // WAI-ARIA accordion keyboard support: arrow keys, Home and End move focus
  // between the triggers of the same accordion.
  document.addEventListener("keydown", (e) => {
    if (!(e.target instanceof Element)) return;
    const trigger = e.target.closest('[data-slot="accordion-trigger"]');
    if (!trigger) return;
    const accordion = trigger.closest('[data-slot="accordion"]');
    if (!accordion) return;
    const triggers = [...accordion.querySelectorAll('[data-slot="accordion-trigger"]')].filter(
      (t) => !t.disabled && t.closest('[data-slot="accordion"]') === accordion
    );
    const index = triggers.indexOf(trigger);
    let next;
    if (e.key === "ArrowDown") next = triggers[(index + 1) % triggers.length];
    else if (e.key === "ArrowUp") next = triggers[(index - 1 + triggers.length) % triggers.length];
    else if (e.key === "Home") next = triggers[0];
    else if (e.key === "End") next = triggers[triggers.length - 1];
    if (next) {
      e.preventDefault();
      next.focus();
    }
  });
})();

// components/avatar/avatar.js
(function () {
  "use strict";

  // Fade an avatar image in once it has loaded. Until then — or if it never
  // loads — it stays transparent (opacity-0) and the fallback stacked
  // underneath shows through. CSP-safe replacement for inline handlers.
  function reveal(img) {
    img.dataset.loaded = "true";
  }

  // Images that load after this script runs.
  document.addEventListener(
    "load",
    function (e) {
      const img = e.target;
      if (img.matches && img.matches("[data-tui-avatar-image]")) reveal(img);
    },
    true,
  );

  // Images that already loaded before this script ran.
  document.querySelectorAll("[data-tui-avatar-image]").forEach(function (img) {
    if (img.complete && img.naturalWidth > 0) reveal(img);
  });
})();

// components/baseui/scroll_lock.js
// Port of @base-ui/utils/useScrollLock.ts. Helpers from useTimeout.ts,
// useAnimationFrame.ts, platform/os.ts, platform/engine.ts, @floating-ui/utils/dom,
// and @base-ui/react/utils/useAnchoredPopupScrollLock.ts live here as well.
(function () {
  "use strict";

  // @base-ui/utils/platform/{os,engine}.ts
  const lowerPlatform = navigator.platform.toLowerCase();
  const ios = /^i(os$|p)/.test(lowerPlatform) ||
    (lowerPlatform === "macintel" && navigator.maxTouchPoints > 1);
  const webkit = typeof CSS !== "undefined" && !!CSS.supports?.("-webkit-backdrop-filter:none");

  const ownerDocument = (referenceElement) => referenceElement?.ownerDocument || document;
  const ownerWindow = (referenceElement) =>
    (referenceElement?.nodeType === 9 ? referenceElement : ownerDocument(referenceElement)).defaultView || window;

  // @floating-ui/utils/dom: isOverflowElement
  function isOverflowElement(element) {
    const { overflow, overflowX, overflowY, display } = ownerWindow(element).getComputedStyle(element);
    return /auto|scroll|overlay|hidden|clip/.test(overflow + overflowY + overflowX) &&
      display !== "inline" && display !== "contents";
  }

  // @base-ui/utils/useTimeout.ts (the imperative helper; no React lifecycle).
  class Timeout {
    static create() { return new Timeout(); }
    currentId = 0;
    start(delay, fn) {
      this.clear();
      this.currentId = setTimeout(() => {
        this.currentId = 0;
        fn();
      }, delay);
    }
    isStarted() { return this.currentId !== 0; }
    clear = () => {
      if (this.currentId !== 0) {
        clearTimeout(this.currentId);
        this.currentId = 0;
      }
    };
  }

  // @base-ui/utils/useAnimationFrame.ts, including its production scheduler.
  class Scheduler {
    callbacks = [];
    callbacksCount = 0;
    nextId = 1;
    startId = 1;
    isScheduled = false;
    tick = (timestamp) => {
      this.isScheduled = false;
      const currentCallbacks = this.callbacks;
      const currentCallbacksCount = this.callbacksCount;
      this.callbacks = [];
      this.callbacksCount = 0;
      this.startId = this.nextId;
      if (currentCallbacksCount > 0) {
        for (let i = 0; i < currentCallbacks.length; i += 1) {
          currentCallbacks[i]?.(timestamp);
        }
      }
    };
    request(fn) {
      const id = this.nextId;
      this.nextId += 1;
      this.callbacks.push(fn);
      this.callbacksCount += 1;
      if (!this.isScheduled) {
        requestAnimationFrame(this.tick);
        this.isScheduled = true;
      }
      return id;
    }
    cancel(id) {
      const index = id - this.startId;
      if (index < 0 || index >= this.callbacks.length || this.callbacks[index] === null) return;
      this.callbacks[index] = null;
      this.callbacksCount -= 1;
    }
  }
  const scheduler = new Scheduler();
  class AnimationFrame {
    static create() { return new AnimationFrame(); }
    static request(fn) { return scheduler.request(fn); }
    static cancel(id) { scheduler.cancel(id); }
    currentId = null;
    request(fn) {
      this.cancel();
      this.currentId = scheduler.request(() => {
        this.currentId = null;
        fn();
      });
    }
    cancel = () => {
      if (this.currentId !== null) {
        scheduler.cancel(this.currentId);
        this.currentId = null;
      }
    };
  }

  let originalHtmlStyles = {};
  let originalBodyStyles = {};
  let originalHtmlScrollBehavior = '';

  // The viewport's overflow comes from <html> when it establishes its own scroll container, and
  // propagates from <body> otherwise. An `overflow` style on the other element doesn't lock the page.
  function getViewportScroller(html, body) {
    return isOverflowElement(html) ? html : body;
  }

  function isPageScrollLocked(win, html, body) {
    return /hidden|clip/.test(win.getComputedStyle(getViewportScroller(html, body)).overflowY);
  }

  function hasInsetScrollbars(referenceElement) {
    if (typeof document === 'undefined') {
      return false;
    }
    const doc = ownerDocument(referenceElement);
    const win = ownerWindow(doc);
    return win.innerWidth - doc.documentElement.clientWidth > 0;
  }

  function supportsStableScrollbarGutter(referenceElement) {
    const supported =
      typeof CSS !== 'undefined' && CSS.supports && CSS.supports('scrollbar-gutter', 'stable');

    if (!supported || typeof document === 'undefined') {
      return false;
    }

    const doc = ownerDocument(referenceElement);
    const html = doc.documentElement;
    const body = doc.body;

    const scrollContainer = getViewportScroller(html, body);

    const originalScrollContainerOverflowY = scrollContainer.style.overflowY;
    const originalHtmlStyleGutter = html.style.scrollbarGutter;

    html.style.scrollbarGutter = 'stable';

    scrollContainer.style.overflowY = 'scroll';
    const before = scrollContainer.offsetWidth;

    scrollContainer.style.overflowY = 'hidden';
    const after = scrollContainer.offsetWidth;

    scrollContainer.style.overflowY = originalScrollContainerOverflowY;
    html.style.scrollbarGutter = originalHtmlStyleGutter;

    return before === after;
  }

  function preventScrollOverlayScrollbars(referenceElement) {
    const doc = ownerDocument(referenceElement);
    const html = doc.documentElement;
    const body = doc.body;

    // If an `overflow` style is present on <html>, we need to lock it, because a lock on <body>
    // won't have any effect.
    // But if <body> has an `overflow` style (like `overflow-x: hidden`), we need to lock it
    // instead, as sticky elements shift otherwise.
    const elementToLock = getViewportScroller(html, body);
    const originalElementToLockStyles = {
      overflowY: elementToLock.style.overflowY,
      overflowX: elementToLock.style.overflowX,
    };

    Object.assign(elementToLock.style, {
      overflowY: 'hidden',
      overflowX: 'hidden',
    });

    return () => {
      Object.assign(elementToLock.style, originalElementToLockStyles);
    };
  }

  function preventScrollInsetScrollbars(referenceElement) {
    const doc = ownerDocument(referenceElement);
    const html = doc.documentElement;
    const body = doc.body;
    const win = ownerWindow(html);

    let scrollTop = 0;
    let scrollLeft = 0;
    let updateGutterOnly = false;
    const resizeFrame = AnimationFrame.create();

    // Pinch-zoom in Safari causes a shift. Just don't lock scroll if there's any pinch-zoom.
    if (webkit && (win.visualViewport?.scale ?? 1) !== 1) {
      return () => {};
    }

    function lockScroll() {
      /* DOM reads: */

      const htmlStyles = win.getComputedStyle(html);
      const bodyStyles = win.getComputedStyle(body);
      const htmlScrollbarGutterValue = htmlStyles.scrollbarGutter || '';
      const hasBothEdges = htmlScrollbarGutterValue.includes('both-edges');
      const scrollbarGutterValue = hasBothEdges ? 'stable both-edges' : 'stable';

      scrollTop = html.scrollTop;
      scrollLeft = html.scrollLeft;

      originalHtmlStyles = {
        scrollbarGutter: html.style.scrollbarGutter,
        overflowY: html.style.overflowY,
        overflowX: html.style.overflowX,
      };
      originalHtmlScrollBehavior = html.style.scrollBehavior;

      originalBodyStyles = {
        position: body.style.position,
        height: body.style.height,
        width: body.style.width,
        boxSizing: body.style.boxSizing,
        overflowY: body.style.overflowY,
        overflowX: body.style.overflowX,
        scrollBehavior: body.style.scrollBehavior,
      };

      const isScrollableY = html.scrollHeight > html.clientHeight;
      const isScrollableX = html.scrollWidth > html.clientWidth;
      const hasConstantOverflowY =
        htmlStyles.overflowY === 'scroll' || bodyStyles.overflowY === 'scroll';
      const hasConstantOverflowX =
        htmlStyles.overflowX === 'scroll' || bodyStyles.overflowX === 'scroll';

      // Values can be negative in Firefox
      const scrollbarWidth = Math.max(0, win.innerWidth - body.clientWidth);
      const scrollbarHeight = Math.max(0, win.innerHeight - body.clientHeight);

      // Avoid shift due to the default <body> margin. This does cause elements to be clipped
      // with whitespace. Warn if <body> has margins?
      const marginY = parseFloat(bodyStyles.marginTop) + parseFloat(bodyStyles.marginBottom);
      const marginX = parseFloat(bodyStyles.marginLeft) + parseFloat(bodyStyles.marginRight);
      const elementToLock = getViewportScroller(html, body);

      updateGutterOnly = supportsStableScrollbarGutter(referenceElement);

      /*
       * DOM writes:
       * Do not read the DOM past this point!
       */

      if (updateGutterOnly) {
        html.style.scrollbarGutter = scrollbarGutterValue;
        elementToLock.style.overflowY = 'hidden';
        elementToLock.style.overflowX = 'hidden';
        return;
      }

      Object.assign(html.style, {
        scrollbarGutter: scrollbarGutterValue,
        overflowY: 'hidden',
        overflowX: 'hidden',
      });

      if (isScrollableY || hasConstantOverflowY) {
        html.style.overflowY = 'scroll';
      }
      if (isScrollableX || hasConstantOverflowX) {
        html.style.overflowX = 'scroll';
      }

      Object.assign(body.style, {
        position: 'relative',
        height:
          marginY || scrollbarHeight ? `calc(100dvh - ${marginY + scrollbarHeight}px)` : '100dvh',
        width: marginX || scrollbarWidth ? `calc(100vw - ${marginX + scrollbarWidth}px)` : '100vw',
        boxSizing: 'border-box',
        // Assign the longhands that `cleanup` restores, so nothing is left behind.
        overflowY: 'hidden',
        overflowX: 'hidden',
        scrollBehavior: 'unset',
      });

      body.scrollTop = scrollTop;
      body.scrollLeft = scrollLeft;
      html.setAttribute('data-tui-scroll-locked', '');
      html.style.scrollBehavior = 'unset';
    }

    function cleanup() {
      Object.assign(html.style, originalHtmlStyles);
      Object.assign(body.style, originalBodyStyles);

      if (!updateGutterOnly) {
        html.scrollTop = scrollTop;
        html.scrollLeft = scrollLeft;
        html.removeAttribute('data-tui-scroll-locked');
        html.style.scrollBehavior = originalHtmlScrollBehavior;
      }
    }

    function handleResize() {
      cleanup();
      resizeFrame.request(lockScroll);
    }

    lockScroll();
    win.addEventListener('resize', handleResize);

    return () => {
      resizeFrame.cancel();
      cleanup();
      // Sometimes this cleanup can run after test teardown because it is called
      // in a `setTimeout(fn, 0)`. Guard the returned cleanup to avoid calling
      // `removeEventListener` when it is no longer available in tests.
      if (typeof win.removeEventListener === 'function') {
        win.removeEventListener('resize', handleResize);
      }
    };
  }

  class ScrollLocker {
    lockCount = 0;
    restore = null;
    timeoutLock = Timeout.create();
    timeoutUnlock = Timeout.create();

    acquire(referenceElement) {
      this.lockCount += 1;
      if (this.lockCount === 1 && this.restore === null) {
        this.timeoutLock.start(0, () => this.lock(referenceElement));
      }
      return this.release;
    }

    release = () => {
      this.lockCount -= 1;
      if (this.lockCount === 0 && this.restore) {
        this.timeoutUnlock.start(0, this.unlock);
      }
    };

    unlock = () => {
      if (this.lockCount === 0 && this.restore) {
        this.restore?.();
        this.restore = null;
      }
    };

    lock(referenceElement) {
      if (this.lockCount === 0 || this.restore !== null) {
        return;
      }

      const doc = ownerDocument(referenceElement);
      const html = doc.documentElement;
      const body = doc.body;
      const win = ownerWindow(html);

      // The page is already locked, either by the site author or by a non-Base UI overlay that
      // hasn't cleaned up yet. Leave it alone and wait for the lock to clear before taking over,
      // otherwise we'd snapshot the locked state and restore it after our own lock is released.
      if (isPageScrollLocked(win, html, body)) {
        const observer = new win.MutationObserver(() => {
          if (isPageScrollLocked(win, html, body)) {
            return;
          }
          observer.disconnect();
          this.restore = null;
          this.lock(referenceElement);
        });

        // Watch every attribute: locks are applied through inline styles, classes, or attributes
        // paired with a stylesheet (`data-scroll-locked` in react-remove-scroll, for example).
        const options = { attributes: true };

        observer.observe(html, options);
        observer.observe(body, options);

        this.restore = () => observer.disconnect();
        return;
      }

      const hasOverlayScrollbars = ios || !hasInsetScrollbars(referenceElement);

      // On iOS, scroll locking does not work if the navbar is collapsed. Due to numerous
      // side effects and bugs that arise on iOS, it must be researched extensively before
      // being enabled to ensure it doesn't cause the following issues:
      // - Textboxes must scroll into view when focused, nor cause a glitchy scroll animation.
      // - The navbar must not force itself into view and cause layout shift.
      // - Scroll containers must not flicker upon closing a popup when it has an exit animation.
      this.restore = hasOverlayScrollbars
        ? preventScrollOverlayScrollbars(referenceElement)
        : preventScrollInsetScrollbars(referenceElement);
    }
  }

  const SCROLL_LOCKER = new ScrollLocker();

  // @base-ui/react/utils/useAnchoredPopupScrollLock.ts: run after positioning.
  const VIEWPORT_WIDTH_TOLERANCE_PX = 20;
  function anchoredPopupScrollLock(enabled, touchOpen, positionerElement, referenceElement) {
    let touchOpenShouldLockScroll = false;
    if (enabled && touchOpen && positionerElement != null) {
      const viewportWidth = ownerDocument(positionerElement).documentElement.clientWidth;
      const popupWidth = positionerElement.offsetWidth;
      touchOpenShouldLockScroll = viewportWidth > 0 && popupWidth > 0 &&
        popupWidth >= viewportWidth - VIEWPORT_WIDTH_TOLERANCE_PX;
    }
    return enabled && (!touchOpen || touchOpenShouldLockScroll)
      ? SCROLL_LOCKER.acquire(referenceElement)
      : () => {};
  }

  window.tui = window.tui || {};
  window.tui.scrollLock = {
    acquire: (referenceElement) => SCROLL_LOCKER.acquire(referenceElement),
    anchoredPopup: anchoredPopupScrollLock,
  };
})();

// components/calendar/calendar.js
(function () {
  // Verbatim class strings from base/ui/calendar.tsx (react-day-picker
  // classNames slots). The look lives in the vendored style-*.css via the
  // classes; none of the grid slots below has a cn- class in
  // any style, they are pure structural utilities. The day button template
  // () lives in the templ file; the grid below is
  // (re)built here.
  const CLS = {
    week: "mt-2 flex w-full",
    weekday:
      "flex-1 rounded-(--cell-radius) text-[0.8rem] font-normal text-muted-foreground select-none",
    weekNumberHeader: "w-(--cell-size) select-none",
    weekNumber: "text-[0.8rem] text-muted-foreground select-none",
    weekNumberInner: "flex size-(--cell-size) items-center justify-center text-center",
    day: "group/day relative aspect-square h-full w-full rounded-(--cell-radius) p-0 text-center select-none [&:last-child[data-selected=true]_button]:rounded-r-(--cell-radius)",
    dayFirstRound: "[&:first-child[data-selected=true]_button]:rounded-l-(--cell-radius)",
    dayFirstRoundWeekNumbers: "[&:nth-child(2)[data-selected=true]_button]:rounded-l-(--cell-radius)",
    rangeStart:
      "relative isolate z-0 rounded-l-(--cell-radius) bg-muted after:absolute after:inset-y-0 after:right-0 after:w-4 after:bg-muted",
    rangeMiddle: "rounded-none",
    rangeEnd:
      "relative isolate z-0 rounded-r-(--cell-radius) bg-muted after:absolute after:inset-y-0 after:left-0 after:w-4 after:bg-muted",
    today: "rounded-(--cell-radius) bg-muted text-foreground data-[selected=true]:rounded-none",
    outside: "text-muted-foreground aria-selected:text-muted-foreground",
    disabled: "text-muted-foreground opacity-50",
    // shadcn-templ extension, no shadcn slot or cn- class for booked days exists.
    booked: "[&>button]:line-through opacity-100",
  };

  function containers() {
    return document.querySelectorAll("[data-tui-calendar]");
  }

  function parseISO(s) {
    if (!s) return null;
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s.trim());
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
  }

  function toISO(d) {
    if (!d) return "";
    const p = (n) => String(n).padStart(2, "0");
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
  }

  function sameDay(a, b) {
    return !!(a && b) && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  function isoWeek(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const day = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  }

  function state(root) {
    if (!root._tui) {
      const selected = parseISO(root.getAttribute("data-tui-calendar-selected"));
      const end = parseISO(root.getAttribute("data-tui-calendar-end"));
      const view = parseISO(root.getAttribute("data-tui-calendar-month")) || selected || new Date();
      root._tui = {
        mode: root.getAttribute("data-tui-calendar-mode") || "single",
        locale: root.getAttribute("data-tui-calendar-locale") || "en-US",
        startOfWeek: parseInt(root.getAttribute("data-tui-calendar-week-starts-on"), 10) || 0,
        outsideDays: root.getAttribute("data-tui-calendar-outside-days") !== "false",
        fixedWeeks: root.hasAttribute("data-tui-calendar-fixed-weeks"),
        weekNumbers: root.hasAttribute("data-tui-calendar-week-number"),
        min: parseISO(root.getAttribute("data-tui-calendar-min")),
        max: parseISO(root.getAttribute("data-tui-calendar-max")),
        disabledDates: (root.getAttribute("data-tui-calendar-disabled") || "")
          .split(",").map(parseISO).filter(Boolean),
        bookedDates: (root.getAttribute("data-tui-calendar-booked-dates") || "")
          .split(",").map(parseISO).filter(Boolean),
        month: new Date(view.getFullYear(), view.getMonth(), 1),
        selected: selected,
        end: end,
      };
    }
    return root._tui;
  }

  function isDisabled(s, date) {
    if (s.min && date < s.min && !sameDay(date, s.min)) return true;
    if (s.max && date > s.max && !sameDay(date, s.max)) return true;
    return s.disabledDates.some((d) => sameDay(d, date)) || s.bookedDates.some((d) => sameDay(d, date));
  }

  function render(root) {
    const s = state(root);
    root.querySelectorAll("[data-tui-calendar-month-block]").forEach((block) => {
      const offset = parseInt(block.getAttribute("data-tui-calendar-month-block"), 10) || 0;
      const month = new Date(s.month.getFullYear(), s.month.getMonth() + offset, 1);
      renderCaption(block, s, month);
      renderWeekdays(block, s);
      renderWeeks(root, block, s, month);
    });
    updateNav(root, s);
    root.dispatchEvent(new CustomEvent("calendar-rendered", { bubbles: true }));
  }

  function renderCaption(block, s, month) {
    const label = block.querySelector("[data-tui-calendar-caption]");
    if (label) {
      label.textContent = month.toLocaleDateString(s.locale, { month: "long", year: "numeric" });
    }
    const monthSelect = block.querySelector("[data-tui-calendar-month-select]");
    if (monthSelect) {
      monthSelect.value = String(month.getMonth());
      const monthLabel = block.querySelector("[data-tui-calendar-month-label]");
      if (monthLabel) {
        monthLabel.textContent = new Date(2000, month.getMonth(), 1).toLocaleDateString(s.locale, { month: "short" });
      }
    }
    const yearSelect = block.querySelector("[data-tui-calendar-year-select]");
    if (yearSelect) {
      yearSelect.value = String(month.getFullYear());
      const yearLabel = block.querySelector("[data-tui-calendar-year-label]");
      if (yearLabel) yearLabel.textContent = String(month.getFullYear());
    }
  }

  function renderWeekdays(block, s) {
    const row = block.querySelector("[data-tui-calendar-weekdays]");
    if (!row) return;
    row.innerHTML = "";
    if (s.weekNumbers) {
      const th = document.createElement("th");
      th.className = CLS.weekNumberHeader;
      row.appendChild(th);
    }
    for (let i = 0; i < 7; i++) {
      const day = (s.startOfWeek + i) % 7;
      const th = document.createElement("th");
      th.className = CLS.weekday;
      th.scope = "col";
      // 2021-08-01 was a Sunday; the offset picks the right weekday name.
      th.textContent = new Date(2021, 7, 1 + day)
        .toLocaleDateString(s.locale, { weekday: "short" }).slice(0, 2);
      row.appendChild(th);
    }
  }

  function dayCellClasses(s, mods) {
    let cls = CLS.day + " " + (s.weekNumbers ? CLS.dayFirstRoundWeekNumbers : CLS.dayFirstRound);
    // A single-day range gets both classes, exactly like react-day-picker.
    if (mods.rangeStart) cls += " " + CLS.rangeStart;
    if (mods.rangeEnd) cls += " " + CLS.rangeEnd;
    if (mods.rangeMiddle) cls += " " + CLS.rangeMiddle;
    if (mods.today) cls += " " + CLS.today;
    if (mods.outside) cls += " " + CLS.outside;
    if (mods.disabled) cls += " " + CLS.disabled;
    if (mods.booked) cls += " " + CLS.booked;
    return cls;
  }

  function renderWeeks(root, block, s, month) {
    const tbody = block.querySelector("[data-tui-calendar-weeks]");
    const template = root.querySelector("[data-tui-calendar-day-template]");
    if (!tbody || !template) return;
    tbody.innerHTML = "";

    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const lead = (first.getDay() - s.startOfWeek + 7) % 7;
    const start = new Date(first.getFullYear(), first.getMonth(), 1 - lead);
    const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const rows = s.fixedWeeks ? 6 : Math.ceil((lead + daysInMonth) / 7);
    const today = new Date();

    for (let w = 0; w < rows; w++) {
      const tr = document.createElement("tr");
      tr.className = CLS.week;
      if (s.weekNumbers) {
        const td = document.createElement("td");
        td.className = CLS.weekNumber;
        const inner = document.createElement("div");
        inner.className = CLS.weekNumberInner;
        inner.textContent = String(isoWeek(new Date(start.getFullYear(), start.getMonth(), start.getDate() + w * 7))).padStart(2, "0");
        td.appendChild(inner);
        tr.appendChild(td);
      }
      for (let i = 0; i < 7; i++) {
        const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + w * 7 + i);
        const outside = date.getMonth() !== month.getMonth();
        const mods = {
          outside: outside,
          today: sameDay(date, today),
          disabled: isDisabled(s, date),
          booked: s.bookedDates.some((d) => sameDay(d, date)),
          selectedSingle: false,
          rangeStart: false,
          rangeMiddle: false,
          rangeEnd: false,
        };
        if (s.mode === "range" && s.selected) {
          const from = s.selected;
          const to = s.end;
          if (to && !sameDay(from, to)) {
            mods.rangeStart = sameDay(date, from);
            mods.rangeEnd = sameDay(date, to);
            mods.rangeMiddle = date > from && date < to;
          } else {
            mods.rangeStart = sameDay(date, from);
            mods.rangeEnd = sameDay(date, from);
          }
        } else if (s.selected) {
          mods.selectedSingle = sameDay(date, s.selected);
        }
        const selected = mods.selectedSingle || mods.rangeStart || mods.rangeMiddle || mods.rangeEnd;

        const td = document.createElement("td");
        td.className = dayCellClasses(s, mods) + (outside && !s.outsideDays ? " invisible" : "");
        td.setAttribute("data-selected", selected ? "true" : "false");

        const btn = template.content.firstElementChild.cloneNode(true);
        btn.textContent = String(date.getDate());
        btn.setAttribute("data-tui-calendar-day", toISO(date));
        btn.setAttribute("data-day", date.toLocaleDateString(s.locale));
        btn.setAttribute("data-outside", outside ? "true" : "false");
        btn.setAttribute("data-selected-single", mods.selectedSingle ? "true" : "false");
        btn.setAttribute("data-range-start", mods.rangeStart ? "true" : "false");
        btn.setAttribute("data-range-middle", mods.rangeMiddle ? "true" : "false");
        btn.setAttribute("data-range-end", mods.rangeEnd ? "true" : "false");
        if (selected) btn.setAttribute("aria-selected", "true");
        if (mods.disabled || (outside && !s.outsideDays)) btn.disabled = true;
        td.appendChild(btn);
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
  }

  function updateNav(root, s) {
    const prev = root.querySelector("[data-tui-calendar-prev]");
    const next = root.querySelector("[data-tui-calendar-next]");
    if (prev && s.min) {
      prev.disabled = s.month <= new Date(s.min.getFullYear(), s.min.getMonth(), 1);
    }
    if (next && s.max) {
      next.disabled = new Date(s.month.getFullYear(), s.month.getMonth() + 1, 1) > s.max;
    }
  }

  function sync(root, s) {
    const hidden = root.querySelector("[data-tui-calendar-hidden-input]");
    const hiddenEnd = root.querySelector("[data-tui-calendar-hidden-end-input]");
    if (hiddenEnd) hiddenEnd.value = toISO(s.end);
    if (hidden && hidden.value !== toISO(s.selected)) {
      hidden.value = toISO(s.selected);
      hidden.dispatchEvent(new Event("change", { bubbles: true }));
    }
    root.dispatchEvent(
      new CustomEvent("calendar-change", {
        bubbles: true,
        detail: { value: s.selected, endValue: s.end, valueISO: toISO(s.selected), endValueISO: toISO(s.end) },
      }),
    );
  }

  // Range selection is react-day-picker's addToRange (min 0, not required):
  // every click yields a complete range, a single day means from == to.
  // Clicking that single day again clears, clicking the start collapses to
  // it, clicking the end makes it the new start, clicks before/after extend,
  // clicks inside move the end.
  function selectDate(root, date) {
    const s = state(root);
    if (s.mode === "range") {
      const from = s.selected;
      const to = s.end || s.selected;
      if (!from) {
        s.selected = date;
        s.end = date;
      } else if (sameDay(from, date) && sameDay(to, date)) {
        s.selected = null;
        s.end = null;
      } else if (sameDay(from, date)) {
        s.end = date;
      } else if (sameDay(to, date)) {
        s.selected = date;
        s.end = date;
      } else if (date < from) {
        s.selected = date;
      } else {
        s.end = date;
      }
    } else {
      s.selected = sameDay(s.selected, date) ? null : date;
    }
    render(root);
    sync(root, s);
    // Re-rendering destroyed the clicked button; refocus its replacement so
    // the focus ring stays on the day, exactly like react-day-picker.
    const btn = root.querySelector('[data-tui-calendar-day="' + toISO(date) + '"]');
    if (btn) btn.focus();
  }

  function setDate(root, date) {
    const s = state(root);
    s.selected = date;
    s.end = s.mode === "range" ? date : null;
    s.month = new Date(date.getFullYear(), date.getMonth(), 1);
    render(root);
    sync(root, s);
  }

  document.addEventListener("click", (e) => {
    if (!(e.target instanceof Element)) return;
    const root = e.target.closest("[data-tui-calendar]");
    if (!root) return;
    const s = state(root);

    const day = e.target.closest("[data-tui-calendar-day]");
    if (day && !day.disabled) {
      selectDate(root, parseISO(day.getAttribute("data-tui-calendar-day")));
      return;
    }
    if (e.target.closest("[data-tui-calendar-prev]")) {
      s.month = new Date(s.month.getFullYear(), s.month.getMonth() - 1, 1);
      render(root);
      return;
    }
    if (e.target.closest("[data-tui-calendar-next]")) {
      s.month = new Date(s.month.getFullYear(), s.month.getMonth() + 1, 1);
      render(root);
    }
  });

  document.addEventListener("change", (e) => {
    if (!(e.target instanceof Element)) return;
    const root = e.target.closest("[data-tui-calendar]");
    if (!root) return;
    const s = state(root);
    if (e.target.hasAttribute("data-tui-calendar-month-select")) {
      s.month = new Date(s.month.getFullYear(), parseInt(e.target.value, 10), 1);
      render(root);
    } else if (e.target.hasAttribute("data-tui-calendar-year-select")) {
      s.month = new Date(parseInt(e.target.value, 10), s.month.getMonth(), 1);
      render(root);
    }
  });

  // Programmatic selection, e.g. from preset buttons: dispatch a
  // "calendar-set" CustomEvent with detail.date (ISO) on/inside the calendar.
  document.addEventListener("calendar-set", (e) => {
    const root = e.target instanceof Element && e.target.closest("[data-tui-calendar]");
    if (!root) return;
    const date = parseISO(e.detail && e.detail.date);
    if (date) setDate(root, date);
  });

  // Keyboard: arrows move day focus, Enter/Space activate natively.
  document.addEventListener("keydown", (e) => {
    if (!(e.target instanceof Element) || !e.target.hasAttribute("data-tui-calendar-day")) return;
    const deltas = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    const delta = deltas[e.key];
    if (!delta) return;
    e.preventDefault();
    const root = e.target.closest("[data-tui-calendar]");
    const s = state(root);
    const current = parseISO(e.target.getAttribute("data-tui-calendar-day"));
    const nextDate = new Date(current.getFullYear(), current.getMonth(), current.getDate() + delta);
    if (nextDate.getMonth() !== s.month.getMonth() || nextDate.getFullYear() !== s.month.getFullYear()) {
      s.month = new Date(nextDate.getFullYear(), nextDate.getMonth(), 1);
      render(root);
    }
    const btn = root.querySelector('[data-tui-calendar-day="' + toISO(nextDate) + '"]');
    if (btn) btn.focus();
  });

  // The focus ring lives on the cell (group/day) like react-day-picker.
  document.addEventListener("focusin", (e) => {
    if (e.target instanceof Element && e.target.hasAttribute("data-tui-calendar-day")) {
      const td = e.target.closest("td");
      if (td) td.setAttribute("data-focused", "true");
    }
  });
  document.addEventListener("focusout", (e) => {
    if (e.target instanceof Element && e.target.hasAttribute("data-tui-calendar-day")) {
      const td = e.target.closest("td");
      if (td) td.removeAttribute("data-focused");
    }
  });

  function init() {
    containers().forEach((root) => {
      if (!root._tuiRendered) {
        root._tuiRendered = true;
        render(root);
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
  // Re-init on any childList mutation, directly (never rAF-deferred: rAF
  // does not fire in hidden tabs or throttled iframes): swapped-in markup
  // wires itself.
  new MutationObserver(() => init()).observe(document.body, { childList: true, subtree: true });
})();

// components/carousel/carousel.js
(function () {
  "use strict";

  // Embla-pendant engine: slides snap content-flush to the viewport, drags
  // track the pointer 1:1 with edge resistance, and the animation runs
  // embla's own physics, per 60fps step the velocity is attracted towards
  // the target and damped by friction. Same defaults as embla.
  const DURATION = 25; // embla's duration option, attraction = diff / DURATION
  const FRICTION = 0.68;
  const STEP_MS = 1000 / 60;
  const MOMENTUM_MS = 140; // how far a release projects the current velocity
  const RESISTANCE = 0.35; // drag resistance beyond the edges

  const instances = new WeakMap();

  function setup(root) {
    if (instances.has(root)) return;
    const viewport = root.querySelector("[data-tui-carousel-viewport]");
    const track = root.querySelector("[data-tui-carousel-track]");
    if (!viewport || !track) return;

    const state = {
      root,
      viewport,
      track,
      index: 0,
      offset: 0,
      target: 0,
      velocity: 0,
      raf: null,
      horizontal: root.getAttribute("data-tui-carousel-orientation") !== "vertical",
      align: root.getAttribute("data-tui-carousel-align") || "center",
      loop: root.getAttribute("data-tui-carousel-loop") === "true",
      autoplay: root.getAttribute("data-tui-carousel-autoplay") === "true",
      interval: parseInt(root.getAttribute("data-tui-carousel-interval"), 10) || 5000,
      timer: null,
    };
    instances.set(root, state);

    track.addEventListener("pointerdown", (e) => onDragStart(state, e));
    root.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        scrollPrev(state);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        scrollNext(state);
      }
    });

    if (state.autoplay) {
      startAutoplay(state);
      root.addEventListener("mouseenter", () => stopAutoplay(state));
      root.addEventListener("mouseleave", () => startAutoplay(state));
    }

    update(state, false);
  }

  function items(state) {
    return [...state.track.querySelectorAll("[data-tui-carousel-item]")].filter(
      (item) => item.parentElement === state.track,
    );
  }

  // Snap offsets per slide relative to the first slide, so the gutter margin
  // on the track cancels against the slide padding and content sits flush.
  // The last snaps are clamped so the track end aligns with the viewport
  // edge (embla's trimSnaps).
  function snaps(state) {
    const its = items(state);
    if (!its.length) return [0];
    const base = state.horizontal ? its[0].offsetLeft : its[0].offsetTop;
    const last = its[its.length - 1];
    const end =
      (state.horizontal ? last.offsetLeft + last.offsetWidth : last.offsetTop + last.offsetHeight) -
      base;
    const viewportSize = state.horizontal
      ? state.viewport.clientWidth
      : state.viewport.clientHeight;
    // The slide boxes carry the gutter as leading padding, the visible
    // content ends one gutter before the last box edge.
    const style = getComputedStyle(its[0]);
    const gutter = parseFloat(state.horizontal ? style.paddingLeft : style.paddingTop) || 0;
    const max = Math.max(0, end - gutter - viewportSize);
    const points = [];
    for (const item of its) {
      const start = (state.horizontal ? item.offsetLeft : item.offsetTop) - base;
      const size = (state.horizontal ? item.offsetWidth : item.offsetHeight) - gutter;
      let offset = start;
      if (state.align === "center") offset = start - (viewportSize - size) / 2;
      else if (state.align === "end") offset = start - (viewportSize - size);
      // Clamp into the scrollable range (embla's trimSnaps), edge slides
      // collapse onto the flush bounds and dedupe.
      offset = Math.max(0, Math.min(offset, max));
      if (!points.length || points[points.length - 1] < offset - 0.5) points.push(offset);
    }
    return points.length ? points : [0];
  }

  function render(state) {
    state.track.style.transform = state.horizontal
      ? "translate3d(" + -state.offset + "px, 0, 0)"
      : "translate3d(0, " + -state.offset + "px, 0)";
  }

  function stopEngine(state) {
    cancelAnimationFrame(state.raf);
    state.raf = null;
  }

  // Embla's scroll body: every 60fps step the velocity is pulled towards the
  // target and damped, which gives the fast start and floaty settle.
  function startEngine(state) {
    stopEngine(state);
    let last = performance.now();
    let carry = 0;
    const tick = (now) => {
      carry += now - last;
      last = now;
      while (carry >= STEP_MS) {
        carry -= STEP_MS;
        const diff = state.target - state.offset;
        state.velocity += diff / DURATION;
        state.velocity *= FRICTION;
        state.offset += state.velocity;
      }
      if (Math.abs(state.target - state.offset) < 0.05 && Math.abs(state.velocity) < 0.05) {
        state.offset = state.target;
        state.velocity = 0;
        render(state);
        state.raf = null;
        return;
      }
      render(state);
      state.raf = requestAnimationFrame(tick);
    };
    state.raf = requestAnimationFrame(tick);
  }

  function update(state, animate) {
    const points = snaps(state);
    state.index = Math.max(0, Math.min(state.index, points.length - 1));
    state.target = points[state.index];
    if (animate) {
      startEngine(state);
    } else {
      stopEngine(state);
      state.offset = state.target;
      state.velocity = 0;
      render(state);
    }

    const prev = state.root.querySelector("[data-tui-carousel-prev]");
    const next = state.root.querySelector("[data-tui-carousel-next]");
    if (prev) prev.disabled = !state.loop && state.index === 0;
    if (next) next.disabled = !state.loop && state.index >= points.length - 1;

    // Expose the selection like embla's select event, attributes for CSS and
    // a bubbling event for scripts.
    state.root.setAttribute("data-tui-carousel-selected", state.index + 1);
    state.root.setAttribute("data-tui-carousel-count", points.length);
    state.root.dispatchEvent(
      new CustomEvent("carousel-select", {
        bubbles: true,
        detail: { selected: state.index + 1, count: points.length },
      })
    );
  }

  function scrollPrev(state) {
    const count = snaps(state).length;
    if (state.index > 0) {
      state.index -= 1;
    } else if (state.loop) {
      state.index = count - 1;
    } else {
      return;
    }
    update(state, true);
  }

  function scrollNext(state) {
    const count = snaps(state).length;
    if (state.index < count - 1) {
      state.index += 1;
    } else if (state.loop) {
      state.index = 0;
    } else {
      return;
    }
    update(state, true);
  }

  // ----- drag -----------------------------------------------------------------

  function onDragStart(state, e) {
    if (e.button !== 0) return;
    stopAutoplay(state);
    stopEngine(state);
    const points = snaps(state);
    const max = points[points.length - 1];
    const startCoord = state.horizontal ? e.clientX : e.clientY;
    const startOffset = state.offset;
    let lastCoord = startCoord;
    let lastTime = performance.now();
    let velocity = 0;
    let moved = false;

    const onMove = (ev) => {
      const coord = state.horizontal ? ev.clientX : ev.clientY;
      const now = performance.now();
      if (now > lastTime) velocity = (coord - lastCoord) / (now - lastTime);
      lastCoord = coord;
      lastTime = now;
      moved = true;

      // The track follows the pointer, with resistance beyond the edges.
      let offset = startOffset - (coord - startCoord);
      if (offset < 0) offset = offset * RESISTANCE;
      if (offset > max) offset = max + (offset - max) * RESISTANCE;
      state.offset = offset;
      render(state);
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      if (!moved) return;
      // Project the momentum, settle on the nearest snap and carry the drag
      // velocity into the engine (embla's force application).
      const projected = state.offset - velocity * MOMENTUM_MS;
      let nearest = 0;
      for (let i = 1; i < points.length; i++) {
        if (Math.abs(points[i] - projected) < Math.abs(points[nearest] - projected)) nearest = i;
      }
      state.index = nearest;
      state.velocity = -velocity * STEP_MS;
      update(state, true);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  // ----- autoplay ---------------------------------------------------------------

  function startAutoplay(state) {
    if (!state.autoplay) return;
    stopAutoplay(state);
    state.timer = setInterval(() => {
      const count = snaps(state).length;
      state.index = state.index >= count - 1 ? 0 : state.index + 1;
      update(state, true);
    }, state.interval);
  }

  function stopAutoplay(state) {
    clearInterval(state.timer);
    state.timer = null;
  }

  // ----- events -----------------------------------------------------------------

  document.addEventListener("click", (e) => {
    if (!(e.target instanceof Element)) return;
    const button = e.target.closest("[data-tui-carousel-prev], [data-tui-carousel-next]");
    const root = button?.closest("[data-tui-carousel]");
    if (!root) return;
    const state = instances.get(root);
    if (!state) return;
    if (button.hasAttribute("data-tui-carousel-prev")) {
      scrollPrev(state);
    } else {
      scrollNext(state);
    }
  });

  window.addEventListener("resize", () => {
    document.querySelectorAll("[data-tui-carousel]").forEach((root) => {
      const state = instances.get(root);
      if (state) update(state, false);
    });
  });

  function init() {
    document.querySelectorAll("[data-tui-carousel]").forEach(setup);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
  // Re-init on any childList mutation, directly (never rAF-deferred: rAF
  // does not fire in hidden tabs or throttled iframes): swapped-in markup
  // wires itself.
  new MutationObserver(() => init()).observe(document.body, { childList: true, subtree: true });
})();

// components/chart/chart.js
/**
 * shadcn-templ chart - client renderer.
 *
 * The server emits the chart model as JSON; this module is the pendant of
 * Recharts in the browser and draws everything. It is a literal port of
 * the parts of the reference libraries the chart components need:
 * - recharts ResponsiveContainer: render at the container's real pixel
 *   size via ResizeObserver, so bars, radii and text keep their sizes.
 * - recharts-scale getNiceTickValues: the radar domain and tick values.
 * - recharts CartesianAxis preserveEnd: tick culling with measured label
 *   sizes and minTickGap.
 * - d3-shape: curveNatural, curveLinear, curveStep and stackOffsetExpand.
 * - d3-array ticks: the grid angles of a radial chart, whose angle axis
 *   has no tick count and so falls back to d3's default ten.
 * - recharts Sector: the sector path and its rounded corners, plus
 *   getBarPosition and computeRadialBarDataItems for the radial rings.
 * - react-smooth: entrance and update animations with the CSS ease bezier,
 *   the from state paints synchronously on mount and the clock starts on
 *   the first real frame.
 * - shadcn ChartTooltipContent and ChartStyle: tooltip markup, classes and
 *   the per chart color variables.
 * Optional model fields carry Recharts' prop defaults at the JSON boundary
 * (xAxisHeight 0, minTickGap 5, tickCount 5, innerRadius 0).
 */

const TOOLTIP_CLASS = "border-border/50 bg-background gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs shadow-xl grid min-w-32 items-start";

/* ---------------------------------------------------------------- */
/* Geometry (ports of the Go engine)                                */
/* ---------------------------------------------------------------- */

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

function fmtF(v) {
  return String(Math.round(v * 1000) / 1000);
}

function getDigitCount(v) {
  if (v === 0) return 1;
  return Math.floor(Math.log10(Math.abs(v))) + 1;
}

function adaptiveStep(rough, correction) {
  if (rough <= 0) return 0;
  const digitCount = getDigitCount(rough);
  const digitCountValue = Math.pow(10, digitCount);
  const stepRatio = rough / digitCountValue;
  const scale = digitCount !== 1 ? 0.05 : 0.1;
  return (Math.ceil(stepRatio / scale) + correction) * scale * digitCountValue;
}

/* recharts-scale getFormatStep: the step between two ticks that reads
 * well (10, 20, 25). */
function getFormatStep(roughStep, allowDecimals, correctionFactor) {
  if (roughStep <= 0) return 0;
  const digitCount = getDigitCount(roughStep);
  const digitCountValue = Math.pow(10, digitCount);
  const stepRatio = roughStep / digitCountValue;
  const stepRatioScale = digitCount !== 1 ? 0.05 : 0.1;
  const amendStepRatio = (Math.ceil(stepRatio / stepRatioScale) + correctionFactor) * stepRatioScale;
  const formatStep = amendStepRatio * digitCountValue;
  return allowDecimals ? formatStep : Math.ceil(formatStep);
}

/* recharts-scale calculateStep: zero is always a tick when the interval
 * contains it, and the step grows until the ticks cover the interval. */
function calculateStep(min, max, tickCount, allowDecimals, correctionFactor = 0) {
  if (!Number.isFinite((max - min) / (tickCount - 1))) {
    return { step: 0, tickMin: 0, tickMax: 0 };
  }
  const step = getFormatStep((max - min) / (tickCount - 1), allowDecimals, correctionFactor);
  let middle;
  if (min <= 0 && max >= 0) {
    middle = 0;
  } else {
    middle = (min + max) / 2;
    middle = middle - (middle % step);
  }
  let belowCount = Math.ceil((middle - min) / step);
  let upCount = Math.ceil((max - middle) / step);
  const scaleCount = belowCount + upCount + 1;
  if (scaleCount > tickCount) {
    return calculateStep(min, max, tickCount, allowDecimals, correctionFactor + 1);
  }
  if (scaleCount < tickCount) {
    upCount = max > 0 ? upCount + (tickCount - scaleCount) : upCount;
    belowCount = max > 0 ? belowCount : belowCount + (tickCount - scaleCount);
  }
  return { step, tickMin: middle - belowCount * step, tickMax: middle + upCount * step };
}

/* recharts-scale getNiceTickValues: the tick values of an interval, with
 * the count guaranteed. */
function niceTickValues(min, max, tickCount = 6, allowDecimals = true) {
  const count = Math.max(tickCount, 2);
  if (min === max) return [min];
  const { step, tickMin, tickMax } = calculateStep(min, max, count, allowDecimals);
  if (step <= 0) return [0];
  const values = [];
  for (let v = tickMin; v <= tickMax + 0.1 * step; v += step) values.push(v);
  return values;
}

function linearY(v, dmax, top, height) {
  if (dmax === 0) return top + height;
  return top + height - (v / dmax) * height;
}

/* expandValues normalizes stacked values per index to a total of 1
 * (d3-shape stackOffsetExpand behind Recharts' "expand"). */
function expandValues(series) {
  const n = series[0].values.length;
  const vals = series.map(() => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    let sum = 0;
    for (const s of series) if (!s.hidden) sum += s.values[i];
    if (sum > 0) {
      series.forEach((s, si) => {
        if (!s.hidden) vals[si][i] = s.values[i] / sum;
      });
    }
  }
  return vals;
}

/* domainTicks computes a model's nice tick values (stacked aware); the
 * domain spans from the first to the last tick, like Recharts. */
function domainTicks(m, tickCount = 5) {
  if (m.stackOffset === "expand") {
    return Array.from({ length: tickCount }, (_, i) => i / (tickCount - 1));
  }
  let max = 0;
  let min = 0;
  const n = m.series[0].values.length;
  if (m.stacked) {
    for (let i = 0; i < n; i++) {
      let sum = 0;
      for (const s of m.series) sum += s.values[i];
      if (sum > max) max = sum;
      if (sum < min) min = sum;
    }
  } else {
    for (const s of m.series) {
      for (const v of s.values) {
        if (v > max) max = v;
        if (v < min) min = v;
      }
    }
  }
  return niceTickValues(min, max, tickCount);
}

/* valueScale maps a value onto its pixel position. With negative values
 * the domain spans [min, max] and the zero baseline sits inside the plot,
 * like Recharts' linear scale. */
function valueScale(m, start, length) {
  const [min, max] = m.domain;
  const span = max - min || 1;
  return {
    max,
    min,
    // pos returns the pixel of a value along the axis from start.
    pos: (v) => start + length - ((v - min) / span) * length,
    zero: start + length - ((0 - min) / span) * length,
  };
}

function barPositions(band, categoryGap, count) {
  const gap = categoryGap * band;
  let realBarGap = 4;
  if (band - 2 * gap - (count - 1) * realBarGap <= 0) realBarGap = 0;
  let size = (band - 2 * gap - (count - 1) * realBarGap) / count;
  if (size > 1) size = Math.round(size);
  const offsets = [];
  for (let i = 0; i < count; i++) offsets.push(gap + (size + realBarGap) * i);
  return [offsets, size];
}

/* getRectanglePath from Recharts' Rectangle: the radius is one value for
 * all corners or four values starting at the top left, clamped to half the
 * rectangle. */
function roundedBarPath(x, y, w, h, radius) {
  const corners = Array.isArray(radius) ? radius : [radius || 0];
  const [tl, tr, br, bl] = corners.length === 4 ? corners : [corners[0] || 0, corners[0] || 0, corners[0] || 0, corners[0] || 0];
  const max = Math.min(Math.abs(w) / 2, Math.abs(h) / 2);
  const c = [tl, tr, br, bl].map((v) => Math.max(0, Math.min(v, max)));
  if (c.every((v) => v === 0)) {
    return `M ${fmtF(x)},${fmtF(y)} h ${fmtF(w)} v ${fmtF(h)} h ${fmtF(-w)} Z`;
  }
  return (
    `M ${fmtF(x)},${fmtF(y + c[0])} a ${fmtF(c[0])},${fmtF(c[0])} 0 0 1 ${fmtF(c[0])},${fmtF(-c[0])} ` +
    `h ${fmtF(w - c[0] - c[1])} a ${fmtF(c[1])},${fmtF(c[1])} 0 0 1 ${fmtF(c[1])},${fmtF(c[1])} ` +
    `v ${fmtF(h - c[1] - c[2])} a ${fmtF(c[2])},${fmtF(c[2])} 0 0 1 ${fmtF(-c[2])},${fmtF(c[2])} ` +
    `h ${fmtF(-(w - c[2] - c[3]))} a ${fmtF(c[3])},${fmtF(c[3])} 0 0 1 ${fmtF(-c[3])},${fmtF(-c[3])} Z`
  );
}

function naturalControls(x) {
  const n = x.length - 1;
  const a = new Array(n);
  const b = new Array(n);
  const r = new Array(n);
  a[0] = 0;
  b[0] = 2;
  r[0] = x[0] + 2 * x[1];
  for (let i = 1; i < n - 1; i++) {
    a[i] = 1;
    b[i] = 4;
    r[i] = 4 * x[i] + 2 * x[i + 1];
  }
  a[n - 1] = 2;
  b[n - 1] = 7;
  r[n - 1] = 8 * x[n - 1] + x[n];
  for (let i = 1; i < n; i++) {
    const m = a[i] / b[i - 1];
    b[i] -= m;
    r[i] -= m * r[i - 1];
  }
  a[n - 1] = r[n - 1] / b[n - 1];
  for (let i = n - 2; i >= 0; i--) {
    a[i] = (r[i] - a[i + 1]) / b[i];
  }
  b[n - 1] = (x[n] + a[n - 1]) / 2;
  for (let i = 0; i < n - 1; i++) {
    b[i] = 2 * x[i + 1] - a[i + 1];
  }
  return [a, b];
}

function naturalPath(xs, ys) {
  if (xs.length < 2) return "";
  const [cx1, cx2] = naturalControls(xs);
  const [cy1, cy2] = naturalControls(ys);
  let d = `M${fmtF(xs[0])},${fmtF(ys[0])}`;
  for (let i = 0; i < xs.length - 1; i++) {
    d += `C${fmtF(cx1[i])},${fmtF(cy1[i])},${fmtF(cx2[i])},${fmtF(cy2[i])},${fmtF(xs[i + 1])},${fmtF(ys[i + 1])}`;
  }
  return d;
}

/* d3-shape curveLinear. */
function linearPath(xs, ys) {
  if (xs.length < 2) return "";
  let d = `M${fmtF(xs[0])},${fmtF(ys[0])}`;
  for (let i = 1; i < xs.length; i++) {
    d += `L${fmtF(xs[i])},${fmtF(ys[i])}`;
  }
  return d;
}

/* d3-shape curveStep (t = 0.5): y switches at the midpoint, ends on the
 * last point. */
function stepPath(xs, ys) {
  if (xs.length < 2) return "";
  let d = `M${fmtF(xs[0])},${fmtF(ys[0])}`;
  for (let i = 1; i < xs.length; i++) {
    const x1 = (xs[i - 1] + xs[i]) / 2;
    d += `L${fmtF(x1)},${fmtF(ys[i - 1])}L${fmtF(x1)},${fmtF(ys[i])}`;
  }
  d += `L${fmtF(xs[xs.length - 1])},${fmtF(ys[ys.length - 1])}`;
  return d;
}

/* d3-shape curveMonotoneX (Steffen 1990 monotone Hermite interpolation),
 * Recharts' type="monotone". */
function monotonePath(xs, ys) {
  if (xs.length < 2) return "";
  const sign = (x) => (x < 0 ? -1 : 1);
  const slope3 = (x0, y0, x1, y1, x2, y2) => {
    const h0 = x1 - x0;
    const h1 = x2 - x1;
    const s0 = (y1 - y0) / (h0 || (h1 < 0 && -0));
    const s1 = (y2 - y1) / (h1 || (h0 < 0 && -0));
    const p = (s0 * h1 + s1 * h0) / (h0 + h1);
    return (sign(s0) + sign(s1)) * Math.min(Math.abs(s0), Math.abs(s1), 0.5 * Math.abs(p)) || 0;
  };
  const slope2 = (x0, y0, x1, y1, t) => {
    const h = x1 - x0;
    return h ? (3 * (y1 - y0) / h - t) / 2 : t;
  };
  const bezier = (x0, y0, x1, y1, t0, t1) => {
    const dx = (x1 - x0) / 3;
    return `C${fmtF(x0 + dx)},${fmtF(y0 + dx * t0)},${fmtF(x1 - dx)},${fmtF(y1 - dx * t1)},${fmtF(x1)},${fmtF(y1)}`;
  };
  let d = `M${fmtF(xs[0])},${fmtF(ys[0])}`;
  let t0 = NaN;
  for (let i = 1; i < xs.length; i++) {
    let t1;
    if (i < xs.length - 1) {
      t1 = slope3(xs[i - 1], ys[i - 1], xs[i], ys[i], xs[i + 1], ys[i + 1]);
    } else {
      t1 = slope2(xs[i - 1], ys[i - 1], xs[i], ys[i], t0);
    }
    if (i === 1) t0 = slope2(xs[0], ys[0], xs[1], ys[1], t1);
    d += bezier(xs[i - 1], ys[i - 1], xs[i], ys[i], t0, t1);
    t0 = t1;
  }
  return d;
}

/* isGap says whether a series has no value at a row. */
function isGap(s, i) {
  return !!(s.gaps && s.gaps[i]);
}

/* gappedPath draws one subpath per run of values, the pendant of
 * connectNulls off: the curve breaks at every gap. */
function gappedPath(curve, xs, ys, gaps) {
  if (!gaps) return curvePath(curve, xs, ys);
  let d = "";
  let start = 0;
  for (let i = 0; i <= xs.length; i++) {
    if (i < xs.length && !gaps[i]) continue;
    if (i === start + 1) d += `M${fmtF(xs[start])},${fmtF(ys[start])}Z`;
    else if (i > start) d += curvePath(curve, xs.slice(start, i), ys.slice(start, i));
    start = i + 1;
  }
  return d;
}

function gappedAreaPath(curve, xs, top, base, gaps) {
  if (!gaps) return areaPathBetween(curve, xs, top, base);
  let d = "";
  let start = 0;
  for (let i = 0; i <= xs.length; i++) {
    if (i < xs.length && !gaps[i]) continue;
    if (i === start + 1) d += `M${fmtF(xs[start])},${fmtF(top[start])}L${fmtF(xs[start])},${fmtF(base[start])}Z`;
    else if (i > start) d += areaPathBetween(curve, xs.slice(start, i), top.slice(start, i), base.slice(start, i));
    start = i + 1;
  }
  return d;
}

function curvePath(curve, xs, ys) {
  if (curve === "linear") return linearPath(xs, ys);
  if (curve === "step") return stepPath(xs, ys);
  if (curve === "monotone") return monotonePath(xs, ys);
  return naturalPath(xs, ys);
}

/* Recharts' Text verticalAnchor as an SVG dy: the anchor names where the
 * text box sits relative to y. */
function verticalAnchorDy(anchor) {
  if (anchor === "start") return "0.71em";
  if (anchor === "middle") return "0.355em";
  return "0";
}

/* pathLength measures a path string like Recharts measures the rendered
 * curve for the line entrance (strokeDasharray animation). */
let lengthPath = null;
function pathLength(d) {
  if (!lengthPath) {
    lengthPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
  }
  lengthPath.setAttribute("d", d);
  return lengthPath.getTotalLength();
}

function areaPathBetween(curve, xs, ysTop, ysBase) {
  const rx = [...xs].reverse();
  const rb = [...ysBase].reverse();
  const base = curvePath(curve, rx, rb);
  return curvePath(curve, xs, ysTop) + "L" + base.slice(1) + "Z";
}

/* preserveEnd tick culling with real text measurement, like Recharts. */
let measureCtx = null;
function measureLabel(label, refEl) {
  if (!measureCtx) {
    measureCtx = document.createElement("canvas").getContext("2d");
  }
  const cs = getComputedStyle(refEl);
  measureCtx.font = `${cs.fontSize} ${cs.fontFamily}`;
  return measureCtx.measureText(label).width;
}

/* The label height Recharts reads from the DOM: 1.5 times the font size,
 * matching the measured 18px at 12px text. */
function measureLabelHeight(refEl) {
  return parseFloat(getComputedStyle(refEl).fontSize) * 1.5;
}

function preserveEndTicks(coords, sizes, start, end, minTickGap) {
  let sign = 1;
  if (coords.length >= 2 && coords[1] < coords[0]) sign = -1;
  const kept = [];
  for (let i = coords.length - 1; i >= 0; i--) {
    const size = sizes[i];
    let tickCoord = coords[i];
    if (i === coords.length - 1) {
      const gap = sign * (tickCoord + (sign * size) / 2 - end);
      if (gap > 0) tickCoord -= gap * sign;
    }
    if (sign * tickCoord < sign * start || sign * tickCoord > sign * end) continue;
    if (sign * (tickCoord - (sign * size) / 2 - start) >= 0 && sign * (tickCoord + (sign * size) / 2 - end) <= 0) {
      end = tickCoord - sign * (size / 2 + minTickGap);
      kept.push({ index: i, coord: tickCoord });
    }
  }
  return kept.reverse();
}

/* Recharts' CartesianAxis tickSize: the tick line length, and part of the
 * label offset even when the line is hidden. */
const TICK_SIZE = 6;

/* ---------------------------------------------------------------- */
/* Rendering                                                        */
/* ---------------------------------------------------------------- */

let uid = 0;

/* swapSVG applies a newly built SVG to the panel. While the structure is
 * unchanged (animation frames) it only syncs attributes and text in
 * place, like React's reconciliation in Recharts, so frames never churn
 * DOM nodes. */
function swapSVG(panel, svgString) {
  const old = panel.querySelector("svg.recharts-surface");
  if (!old) {
    panel.insertAdjacentHTML("beforeend", svgString);
    return;
  }
  // Hover overlays (cursor band, active dots) are transient additions,
  // drop them before comparing so animation frames keep the fast path.
  old.querySelectorAll(".recharts-tooltip-cursor").forEach((c) => c.parentElement.remove());
  old.querySelectorAll(".recharts-active-dots").forEach((d) => d.remove());
  const tpl = document.createElement("template");
  tpl.innerHTML = svgString;
  const next = tpl.content.firstElementChild;
  const a = old.querySelectorAll("*");
  const b = next.querySelectorAll("*");
  if (a.length !== b.length) {
    old.replaceWith(next);
    return;
  }
  syncAttrs(old, next);
  for (let i = 0; i < a.length; i++) {
    if (a[i].tagName !== b[i].tagName) {
      old.replaceWith(next);
      return;
    }
    syncAttrs(a[i], b[i]);
    if (b[i].childElementCount === 0 && a[i].textContent !== b[i].textContent) {
      a[i].textContent = b[i].textContent;
    }
  }
}

function syncAttrs(el, src) {
  for (const attr of src.attributes) {
    if (el.getAttribute(attr.name) !== attr.value) {
      el.setAttribute(attr.name, attr.value);
    }
  }
}

// Recharts 2.15.4 Line.repeat and Line.getStrokeDasharray: retain the
// user's pattern inside the animated sweep.
function repeat(lines, count) {
  const linesUnit = lines.length % 2 !== 0 ? [...lines, 0] : lines;
  let result = [];
  for (let i = 0; i < count; ++i) result = [...result, ...linesUnit];
  return result;
}

function generateSimpleStrokeDasharray(totalLength, length) {
  return `${length}px ${totalLength - length}px`;
}

function getStrokeDasharray(length, totalLength, lines) {
  const lineLength = lines.reduce((pre, next) => pre + next);
  if (!lineLength) return generateSimpleStrokeDasharray(totalLength, length);
  const count = Math.floor(length / lineLength);
  const remainLength = length % lineLength;
  const restLength = totalLength - length;
  let remainLines = [];
  for (let i = 0, sum = 0; i < lines.length; sum += lines[i], ++i) {
    if (sum + lines[i] > remainLength) {
      remainLines = [...lines.slice(0, i), remainLength - sum];
      break;
    }
  }
  const emptyLines = remainLines.length % 2 === 0 ? [0, restLength] : [restLength];
  return [...repeat(lines, count), ...remainLines, ...emptyLines].map(line => `${line}px`).join(", ");
}

/* CSS 'ease' (cubic-bezier(0.25, 0.1, 0.25, 1)), Recharts' default
 * animation easing. */
function cssEase(t) {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  let lo = 0;
  let hi = 1;
  // Solve x(u) = t for u, then return y(u).
  const bx = (u) => 3 * u * (1 - u) * (1 - u) * 0.25 + 3 * u * u * (1 - u) * 0.25 + u * u * u;
  const by = (u) => 3 * u * (1 - u) * (1 - u) * 0.1 + 3 * u * u * (1 - u) * 1 + u * u * u;
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2;
    if (bx(mid) < t) lo = mid;
    else hi = mid;
  }
  return by((lo + hi) / 2);
}

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

/* The Recharts entrance animation: bars grow from the baseline over
 * 400ms, areas reveal left to right and pies sweep over 1500ms.
 * Like react-smooth, the from state paints synchronously on mount (axes
 * and grid are visible immediately) and the clock starts on the first
 * real frame, so charts in throttled frames play the full entrance the
 * moment frames arrive instead of getting stuck blank. */
function animateChart(panel, m, state, render) {
  if (reducedMotion.matches) {
    render(1);
    return;
  }
  const duration = m.kind === "bar" ? 400 : 1500;
  render(0);
  let beginTime;
  const frame = (now) => {
    if (!beginTime) beginTime = now;
    const alpha = cssEase(Math.min(1, (now - beginTime) / duration));
    render(alpha);
    if (alpha < 1) requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

/* The Recharts update animation: every graphical item interpolates its
 * previous points into the new ones in pixel space, index mapped by
 * prevPointsDiffFactor when the point count changed. */
function morphChart(panel, m, state, render, prevPoints) {
  if (reducedMotion.matches) {
    render(1);
    return;
  }
  const duration = m.kind === "bar" ? 400 : 1500;
  const paint = (t) => {
    state.morph = t < 1 ? { prev: prevPoints, t } : null;
    render(1);
  };
  // Like the entrance: the previous state paints synchronously, the clock
  // starts on the first real frame.
  paint(0);
  let beginTime;
  const frame = (now) => {
    if (!beginTime) beginTime = now;
    const t = cssEase(Math.min(1, (now - beginTime) / duration));
    paint(t);
    if (t < 1) requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

/* interpolate of Recharts' DataUtils. */
function interpolate(start, end, t) {
  if (start == null) return end;
  return start + (end - start) * t;
}

/* morphPoints maps a series' points onto the previous ones the way
 * Recharts does: prevPointsDiffFactor picks the previous index. */
function morphPoints(morph, si, coords, key) {
  if (!morph || !morph.prev || !morph.prev[key] || !morph.prev[key][si]) return coords;
  const prev = morph.prev[key][si];
  const factor = prev.length / coords.length;
  return coords.map((v, i) => {
    const p = prev[Math.floor(i * factor)];
    return p == null ? v : interpolate(p, v, morph.t);
  });
}

function renderCartesian(panel, m, state, alpha = 1) {
  const W = panel.clientWidth;
  const H = panel.clientHeight;
  if (!W || !H) return;
  const legendHeight = legendSize(panel, m);

  const vertical = m.layout === "vertical";
  // selectChartOffsetInternal: the axes add to the margins, the legend box
  // adds to the bottom (or the top with verticalAlign "top", Recharts'
  // appendOffsetOfLegend), and the plot never goes negative.
  const yAxisW = m.yAxisWidth || 0;
  const plotX = m.marginLeft + yAxisW;
  const plotY = m.marginTop + (m.legendVAlign === "top" ? legendHeight : 0);
  const plotW = Math.max(W - m.marginLeft - m.marginRight - yAxisW, 0);
  const plotH = Math.max(H - m.marginTop - m.marginBottom - (m.xAxisHeight || 0) - legendHeight, 0);
  const plotBottom = plotY + plotH;
  const n = m.labels.length;

  // During a morph the scale is pinned to the target domain like
  // Recharts, which interpolates pixel positions on the new scale.
  const ticks = m.ticks;
  const [domainMin, domainMax] = m.domain;

  // Category positions: band centers for bars, evenly spaced points for
  // lines and areas.
  const catStart = vertical ? plotY : plotX;
  const catLength = vertical ? plotH : plotW;
  const bandSize = m.kind === "bar" ? catLength / n : 0;
  const cats = [];
  for (let i = 0; i < n; i++) {
    cats.push(m.kind === "bar" ? catStart + i * bandSize + bandSize / 2 : plotX + (i * plotW) / (n - 1));
  }

  // Explicit pixel size like Recharts' Surface: the svg never stretches
  // between resize frames, every frame lays out fresh. The accessibility
  // layer puts Recharts' role and tabIndex on the surface; it is on unless
  // the chart opted out, Recharts' accessibilityLayer !== false.
  const a11y = m.accessibilityLayer !== false ? ` role="application" tabindex="0"` : "";
  let svg = `<svg class="recharts-surface"${a11y} width="${fmtF(W)}" height="${fmtF(H)}" viewBox="0 0 ${fmtF(W)} ${fmtF(H)}">`;

  if (m.defs && m.defs.length) {
    svg += "<defs>";
    for (const g of m.defs) {
      // The stops are raw markup from the demo, passed through verbatim
      // like Recharts passes defs children through.
      svg += `<linearGradient id="${state.uid}-${g.ID}" x1="${g.X1}" y1="${g.Y1}" x2="${g.X2}" y2="${g.Y2}">${g.Stops || ""}</linearGradient>`;
    }
    svg += "</defs>";
  }

  if (yAxisW > 0 && vertical) {
    // Vertical layout: the y axis carries the category labels.
    const ySizes = cats.map(() => measureLabelHeight(panel));
    const labelX = plotX - TICK_SIZE - (m.yAxisMargin || 0);
    svg += `<g class="recharts-layer recharts-cartesian-axis recharts-yAxis yAxis"><g class="recharts-cartesian-axis-ticks">`;
    // The category coordinates ascend downwards, so the bounds run from
    // the top of the surface to its bottom.
    for (const tk of preserveEndTicks(cats, ySizes, 0, H, m.minTickGap || 5)) {
      svg += `<g class="recharts-layer recharts-cartesian-axis-tick"><text orientation="left" width="${fmtF(yAxisW)}" x="${fmtF(labelX)}" y="${fmtF(tk.coord)}" stroke="none" fill="#666" class="recharts-text recharts-cartesian-axis-tick-value" text-anchor="end"><tspan dy="0.355em">${m.labels[tk.index]}</tspan></text></g>`;
    }
    svg += "</g></g>";
  } else if (yAxisW > 0) {
    const yCoords = ticks.map((tv) => linearY(tv - domainMin, domainMax - domainMin, plotY, plotH));
    const ySizes = ticks.map(() => measureLabelHeight(panel));
    const labelX = plotX - TICK_SIZE - (m.yAxisMargin || 0);
    svg += `<g class="recharts-layer recharts-cartesian-axis recharts-yAxis yAxis">`;
    if (m.yAxisLine) {
      svg += `<line orientation="left" class="recharts-cartesian-axis-line" stroke="#666" fill="none" x1="${fmtF(plotX)}" y1="${fmtF(plotY)}" x2="${fmtF(plotX)}" y2="${fmtF(plotBottom)}"/>`;
    }
    svg += `<g class="recharts-cartesian-axis-ticks">`;
    for (const tk of preserveEndTicks(yCoords, ySizes, H, 0, m.minTickGap || 5)) {
      svg += `<g class="recharts-layer recharts-cartesian-axis-tick">`;
      if (m.yTickLine) {
        svg += `<line orientation="left" class="recharts-cartesian-axis-tick-line" stroke="#666" fill="none" x1="${fmtF(plotX - TICK_SIZE)}" y1="${fmtF(yCoords[tk.index])}" x2="${fmtF(plotX)}" y2="${fmtF(yCoords[tk.index])}"/>`;
      }
      svg += `<text orientation="left" width="${fmtF(yAxisW)}" x="${fmtF(labelX)}" y="${fmtF(tk.coord)}" stroke="none" fill="#666" class="recharts-text recharts-cartesian-axis-tick-value" text-anchor="end"><tspan dy="0.355em">${escapeHTML(m.tickLabels[tk.index])}</tspan></text></g>`;
    }
    svg += "</g></g>";
  }

  if (m.grid) {
    // Recharts draws a line per tick of the value axis and per category of
    // the other one; both directions default to on.
    const valueCoords = ticks.map((tv) => {
      const p = linearY(tv - domainMin, domainMax - domainMin, vertical ? plotX : plotY, vertical ? plotW : plotH);
      return vertical ? plotX + plotW - (p - plotX) : p;
    });
    svg += `<g class="recharts-layer recharts-cartesian-grid">`;
    if (m.gridHorizontal) {
      svg += `<g class="recharts-cartesian-grid-horizontal">`;
      for (const y of vertical ? cats : valueCoords) {
        svg += `<line stroke="#ccc" fill="none" x1="${fmtF(plotX)}" y1="${fmtF(y)}" x2="${fmtF(plotX + plotW)}" y2="${fmtF(y)}"/>`;
      }
      svg += "</g>";
    }
    if (m.gridVertical) {
      svg += `<g class="recharts-cartesian-grid-vertical">`;
      for (const x of vertical ? valueCoords : cats) {
        svg += `<line stroke="#ccc" fill="none" x1="${fmtF(x)}" y1="${fmtF(plotY)}" x2="${fmtF(x)}" y2="${fmtF(plotBottom)}"/>`;
      }
      svg += "</g>";
    }
    svg += "</g>";
  }

  if (m.allowDataOverflow) {
    const id = `${state.uid}-overflow`;
    svg += `<defs><clipPath id="${id}"><rect x="${fmtF(vertical ? plotX : plotX - plotW / 2)}" y="${fmtF(vertical ? plotY - plotH / 2 : plotY)}" width="${fmtF(vertical ? plotW : plotW * 2)}" height="${fmtF(vertical ? plotH * 2 : plotH)}"/></clipPath></defs><g clip-path="url(#${id})">`;
  }
  let xs = [];
  let band = 0;
  // The update-animation sources, Recharts' prevPoints/prevData: full
  // point geometry per series (xs and tops for curves, the signed
  // rectangles for bars, the numeric base line for areas).
  state.points = { tops: [], xs: [], rects: [], base: plotBottom };
  const vals = m.stackOffset === "expand" ? expandValues(m.series) : m.series.map((s) => s.values);

  if (m.kind === "bar") {
    // The category axis runs along x, or along y when the layout is
    // vertical and the bars grow to the right.
    band = bandSize;
    // Stacked bars share one slot per category, like Recharts' stackId.
    const slots = m.stacked ? 1 : m.series.filter(s => !s.hidden).length;
    const [offsets, barSize] = barPositions(band, m.categoryGap, slots);
    const scale = valueScale(m, vertical ? plotX : plotY, vertical ? plotW : plotH);
    // In a vertical layout the value axis grows from left to right, so the
    // scale is mirrored around the plot.
    const valuePos = (v) => (vertical ? plotX + plotW - (scale.pos(v) - plotX) : scale.pos(v));
    const zero = vertical ? plotX + plotW - (scale.zero - plotX) : scale.zero;

    let visibleIndex = 0;
    const stackBase = new Array(n).fill(0);
    state.tops = [];
    for (let si = 0; si < m.series.length; si++) {
      const s = m.series[si];
      if (s.hidden) {
        state.tops.push([]);
        state.points.rects.push([]);
        continue;
      }
      const slot = m.stacked ? 0 : visibleIndex++;

      const tops = [];
      const rects = [];
      // Recharts' Bar geometry keeps the rectangle signed: the origin is
      // the value end and the size runs back to the baseline, so negative
      // bars carry a negative size. Label positions read those signs.
      const rectPos = [];
      const rectSize = [];
      svg += `<g class="recharts-layer recharts-bar"><g class="recharts-layer recharts-bar-rectangles">`;
      for (let i = 0; i < n; i++) {
        const raw = vals[si][i];
        const from = m.stacked ? stackBase[i] : 0;
        const to = m.stacked ? stackBase[i] + raw : raw;
        const base = valuePos(from);
        const end = valuePos(to);
        const cat = catStart + i * band + offsets[slot];
        // The signed rectangle like Recharts computes it: the origin sits
        // at the value end and the size runs back to the baseline.
        let rect = vertical
          ? { x: base, y: cat, width: end - base, height: barSize }
          : { x: cat, y: end, width: barSize, height: base - end };
        // renderRectanglesWithAnimation: with a previous rectangle at the
        // same index all four sides interpolate; without one the bar plays
        // the entrance at the animation clock instead.
        if (state.morph) {
          const prevRects = state.morph.prev.rects && state.morph.prev.rects[si];
          const prev = prevRects && prevRects[i];
          const t = state.morph.t;
          if (prev) {
            rect = {
              x: interpolate(prev.x, rect.x, t),
              y: interpolate(prev.y, rect.y, t),
              width: interpolate(prev.width, rect.width, t),
              height: interpolate(prev.height, rect.height, t),
            };
          } else if (vertical) {
            rect.width = rect.width * t;
          } else {
            const h = rect.height * t;
            rect = { ...rect, y: rect.y + rect.height - h, height: h };
          }
        }
        // The entrance grows the height from the baseline, vertical the
        // width, Recharts' no-prev branch driven by the entrance clock.
        if (alpha < 1) {
          if (vertical) {
            rect.width = rect.width * alpha;
          } else {
            const h = rect.height * alpha;
            rect = { ...rect, y: rect.y + rect.height - h, height: h };
          }
        }
        const fill = (s.cells && s.cells[i]) || s.color;
        const active = s.activeIndex != null && s.activeIndex === i && s.activeBar;
        let attrs = `fill="${fill}"`;
        if (active) {
          const ab = s.activeBar;
          attrs += ` fill-opacity="${fmtF(ab.FillOpacity || 1)}" stroke="${ab.Stroke || fill}"`;
          if (ab.StrokeDasharray) attrs += ` stroke-dasharray="${fmtF(ab.StrokeDasharray)}"`;
          if (ab.StrokeDashoffset) attrs += ` stroke-dashoffset="${fmtF(ab.StrokeDashoffset)}"`;
          if (s.strokeWidth) attrs += ` stroke-width="${fmtF(s.strokeWidth)}"`;
        }
        let d;
        if (vertical) {
          d = roundedBarPath(Math.min(rect.x, rect.x + rect.width), rect.y, Math.abs(rect.width), rect.height, s.radius);
        } else {
          d = roundedBarPath(rect.x, Math.min(rect.y, rect.y + rect.height), rect.width, Math.abs(rect.height), s.radius);
        }
        tops.push(vertical ? rect.x + rect.width : rect.y);
        rectPos.push(vertical ? rect.x : rect.y);
        rectSize.push(vertical ? rect.width : rect.height);
        rects.push(rect);
        svg += `<g class="recharts-layer recharts-bar-rectangle"><path class="recharts-rectangle" ${attrs} d="${d}"/></g>`;
        if (m.stacked) stackBase[i] = to;
      }
      svg += "</g>";
      // Label lists paint after the entrance and after an update morph,
      // like Recharts gates them on isAnimationFinished.
      if (alpha >= 1 && !state.morph && s.labelLists) {
        for (const ll of s.labelLists) {
          svg += `<g class="recharts-layer recharts-label-list">`;
          for (let i = 0; i < n; i++) {
            const catCenter = catStart + i * band + offsets[slot] + barSize / 2;
            const offset = ll.offset || 5;
            // getAttrsOfCartesianLabel: the sign of the rectangle flips the
            // offset and the anchor, so a negative bar labels below its end.
            let x, y, anchor, vAnchor;
            if (vertical) {
              const width = rectSize[i];
              const sign = width >= 0 ? 1 : -1;
              y = catCenter;
              vAnchor = "middle";
              anchor = sign > 0 ? "start" : "end";
              x = ll.position === "right" ? rectPos[i] + width + sign * offset : rectPos[i] + sign * offset;
            } else {
              const height = rectSize[i];
              const sign = height >= 0 ? 1 : -1;
              x = catCenter;
              y = rectPos[i] - sign * offset;
              anchor = "middle";
              vAnchor = sign > 0 ? "end" : "start";
            }
            const fo = ll.fillOpacity ? ` fill-opacity="${fmtF(ll.fillOpacity)}"` : "";
            // LabelList inherits the entry's presentation props, so a label
            // without its own class takes the bar's fill.
            const fill = ll.class ? "" : ` fill="${(s.cells && s.cells[i]) || s.color}"`;
            svg += `<text x="${fmtF(x)}" y="${fmtF(y)}" class="recharts-text recharts-label ${ll.class || ""}" text-anchor="${anchor}" font-size="${fmtF(ll.fontSize || 12)}"${fill}${fo}><tspan dy="${verticalAnchorDy(vAnchor)}">${ll.labels[i]}</tspan></text>`;
          }
          svg += `</g>`;
        }
      }
      svg += "</g>";
      state.tops.push(tops);
      state.points.rects.push(rects);
    }
    xs = cats;
  } else if (m.kind === "line") {
    xs = cats;
    state.tops = [];
    for (let si = 0; si < m.series.length; si++) {
      const s = m.series[si];
      // stepPoints of the update animation: x and y both interpolate from
      // the previous point picked by prevPointsDiffFactor.
      const sx = morphPoints(state.morph, si, cats.slice(), "xs");
      const top = morphPoints(state.morph, si, vals[si].map((v) => linearY(v - domainMin, domainMax - domainMin, plotY, plotH)), "tops");
      if (s.hidden) {
        state.tops.push(top);
        state.points.xs.push(sx);
        continue;
      }
      const d = gappedPath(s.curve, sx, top, s.gaps);
      // The Recharts line entrance: strokeDasharray sweeps the measured
      // curve length from 0 to totalLength.
      let dash = s.strokeDasharray ? ` stroke-dasharray="${s.strokeDasharray}"` : "";
      if (alpha < 1) {
        const total = pathLength(d);
        const pattern = s.strokeDasharray
          ? getStrokeDasharray(total * alpha, total, String(s.strokeDasharray).split(/[,\s]+/gim).map(num => parseFloat(num)))
          : generateSimpleStrokeDasharray(total, total * alpha);
        dash = ` stroke-dasharray="${pattern}"`;
      }
      svg +=
        `<g class="recharts-layer recharts-line">` +
        `<path class="recharts-curve recharts-line-curve" stroke="${s.stroke || s.color}" stroke-width="${s.strokeWidth || 1}" fill="none"${dash} d="${d}"/>`;
      // Dots and labels appear when the entrance and the update morph
      // finished, like Recharts' isAnimationFinished gate on renderDots
      // and LabelList.
      if (alpha >= 1 && !state.morph && s.dot) {
        svg += `<g class="recharts-layer recharts-line-dots">`;
        for (let i = 0; i < n; i++) {
          if (isGap(s, i) || (s.dot.shown && !s.dot.shown[i])) continue;
          if (s.dot.icon) {
            const size = s.dot.size || 24;
            svg += `<g transform="translate(${fmtF(sx[i] - size / 2)},${fmtF(top[i] - size / 2)})">${s.dot.icon}</g>`;
          } else {
            const fill = (s.dot.fills && s.dot.fills[i]) || s.dot.fill || "#fff";
            const stroke = (s.dot.fills && s.dot.fills[i]) || s.stroke || s.color;
            // A dot from the data fill is the demos' explicit Dot element,
            // which carries no strokeWidth, so the SVG default of one wins;
            // a plain dot inherits the line's strokeWidth like Recharts
            // spreading the line props into renderDots.
            const dotStrokeWidth = s.dot.fills ? 1 : s.strokeWidth || 1;
            svg += `<circle r="${fmtF(s.dot.r || 3)}" stroke="${stroke}" stroke-width="${fmtF(dotStrokeWidth)}" fill="${fill}" class="recharts-dot recharts-line-dot" cx="${fmtF(sx[i])}" cy="${fmtF(top[i])}"/>`;
          }
        }
        svg += `</g>`;
      }
      if (alpha >= 1 && !state.morph && s.labelList) {
        const ll = s.labelList;
        svg += `<g class="recharts-layer recharts-label-list">`;
        for (let i = 0; i < n; i++) {
          if (isGap(s, i)) continue;
          const fill = ll.class ? "" : ` fill="${s.stroke || s.color}"`;
          svg += `<text x="${fmtF(sx[i])}" y="${fmtF(top[i] - (ll.offset || 5))}" class="recharts-text recharts-label ${ll.class || ""}" text-anchor="middle" font-size="${fmtF(ll.fontSize || 12)}"${fill}><tspan>${ll.labels[i]}</tspan></text>`;
        }
        svg += `</g>`;
      }
      svg += `</g>`;
      state.tops.push(top);
      state.points.xs.push(sx);
    }
  } else {
    xs = cats;
    // Recharts' entrance animation reveals areas left to right through a
    // clipPath rect (AreaRevealShape). A numeric base line interpolates
    // during the update morph like stepBaseLine.
    const baseY = state.morph && state.morph.prev.base != null ? interpolate(state.morph.prev.base, plotBottom, state.morph.t) : plotBottom;
    const baseline = new Array(n).fill(baseY);
    let base = baseline;
    state.tops = [];
    for (let si = 0; si < m.series.length; si++) {
      const s = m.series[si];
      // stepPoints of the update animation: x and y both interpolate from
      // the previous point picked by prevPointsDiffFactor.
      const sx = morphPoints(state.morph, si, cats.slice(), "xs");
      const top = morphPoints(
        state.morph,
        si,
        m.stacked
          ? base.map((b, i) => b - ((vals[si][i] / (domainMax - domainMin)) * plotH || 0))
          : vals[si].map((v) => linearY(v - domainMin, domainMax - domainMin, plotY, plotH)),
        "tops"
      );
      if (s.hidden) {
        state.tops.push(top);
        state.points.xs.push(sx);
        continue;
      }
      const fill = (s.fill || "").replace("url(#", `url(#${state.uid}-`) || s.color;
      const fillOpacity = s.fillOpacity || 0.6;
      const areaD = m.stacked ? areaPathBetween(s.curve, sx, top, base) : gappedAreaPath(s.curve, sx, top, baseline, s.gaps);
      // HorizontalRect: the reveal spans the point range and reaches the
      // lowest painted y plus the stroke width.
      let clip = "";
      let clipOpen = "";
      if (alpha < 1) {
        const width = alpha * Math.abs(sx[0] - sx[n - 1]);
        const maxY = Math.max(...top, ...(m.stacked ? base : baseline));
        const id = `${state.uid}-reveal-${si}`;
        clip = `<defs><clipPath id="${id}"><rect x="${fmtF(sx[0] < sx[n - 1] ? sx[0] : sx[0] - width)}" y="0" width="${fmtF(width)}" height="${fmtF(Math.floor(maxY + 1))}"/></clipPath></defs>`;
        clipOpen = ` clip-path="url(#${id})"`;
      }
      svg +=
        clip +
        `<g class="recharts-layer recharts-area"${clipOpen}>` +
        `<path class="recharts-curve recharts-area-area" fill="${fill}" fill-opacity="${fillOpacity}" stroke="none" d="${areaD}"/>` +
        `<path class="recharts-curve recharts-area-curve" stroke="${s.stroke || s.color}" fill="none" stroke-width="1" d="${gappedPath(s.curve, sx, top, m.stacked ? null : s.gaps)}"/>` +
        `</g>`;
      state.tops.push(top);
      state.points.xs.push(sx);
      if (m.stacked) base = top;
    }
  }

  if (m.allowDataOverflow) svg += "</g>";

  // The x axis only renders when the chart declared a visible one.
  if (m.xAxisHeight) {
  const labels = vertical ? m.tickLabels : m.labels;
  const coords = vertical ? ticks.map(v => plotX + (v - domainMin) / (domainMax - domainMin || 1) * plotW) : xs;
  const widths = labels.map((l) => measureLabel(l, panel));
  const labelY = plotBottom + TICK_SIZE + (m.tickMargin || 0);
  svg += `<g class="recharts-layer recharts-cartesian-axis recharts-xAxis xAxis">`;
  if (m.xAxisLine) {
    svg += `<line orientation="bottom" class="recharts-cartesian-axis-line" stroke="#666" fill="none" x1="${fmtF(plotX)}" y1="${fmtF(plotBottom)}" x2="${fmtF(plotX + plotW)}" y2="${fmtF(plotBottom)}"/>`;
  }
  svg += `<g class="recharts-cartesian-axis-ticks">`;
  for (const tk of preserveEndTicks(coords, widths, 0, W, m.minTickGap || 5)) {
    svg += `<g class="recharts-layer recharts-cartesian-axis-tick">`;
    if (m.xTickLine) {
      svg += `<line orientation="bottom" class="recharts-cartesian-axis-tick-line" stroke="#666" fill="none" x1="${fmtF(coords[tk.index])}" y1="${fmtF(plotBottom + TICK_SIZE)}" x2="${fmtF(coords[tk.index])}" y2="${fmtF(plotBottom)}"/>`;
    }
    svg += `<text orientation="bottom" height="${fmtF(m.xAxisHeight)}" x="${fmtF(tk.coord)}" y="${fmtF(labelY)}" stroke="none" fill="#666" class="recharts-text recharts-cartesian-axis-tick-value" text-anchor="middle"><tspan dy="0.71em">${escapeHTML(labels[tk.index])}</tspan></text></g>`;
  }
  svg += "</g></g>";
  }
  svg += "</svg>";

  swapSVG(panel, svg);

  state.points.tops = state.tops || [];
  state.geom = { W, H, plotX, plotY, plotW, plotH, plotBottom, band, xs, cats, n, vertical };
}

/* Pie sector path, the port of the Go SectorPath (degrees, 0 at three
 * o'clock, counterclockwise positive). */
/* useElementOffset and setLegendSize: the legend reports its rendered
 * bounding box, and appendOffsetOfLegend takes that height off the chart.
 * The model height is the fallback until the legend has been laid out. */
function legendSize(panel, m) {
  if (!m.legendHeight) return 0;
  const el = panel.querySelector(".recharts-legend-wrapper");
  if (el) {
    const h = el.getBoundingClientRect().height;
    if (h > 0) return h;
  }
  return m.legendHeight;
}

/* polarToCartesian of Recharts: degrees, zero at three o'clock, positive
 * counterclockwise. */
function polarToCartesian(cx, cy, radius, angle) {
  const rad = (angle * Math.PI) / 180;
  return { x: cx + Math.cos(rad) * radius, y: cy - Math.sin(rad) * radius };
}

/* getAngleOfPoint of Recharts' PolarUtils: the polar coordinates of a
 * point around the chart center. */
function angleOfPoint(x, y, cx, cy) {
  const radius = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
  if (radius <= 0) return { radius, angle: 0 };
  let angleInRadian = Math.acos((x - cx) / radius);
  if (y > cy) angleInRadian = 2 * Math.PI - angleInRadian;
  return { radius, angle: (angleInRadian * 180) / Math.PI };
}

/* calculateActiveTickIndex for an angle axis that spans a full circle:
 * the pointer belongs to the tick whose half intervals contain it. */
function activeAngleIndex(coordinate, ticks) {
  const len = ticks.length;
  if (len <= 1) return 0;
  const range = [90, -270];
  for (let i = 0; i < len; i++) {
    const before = i > 0 ? ticks[i - 1] : ticks[len - 1];
    const cur = ticks[i];
    const after = i >= len - 1 ? ticks[0] : ticks[i + 1];
    const sign = (v) => (v > 0 ? 1 : v < 0 ? -1 : 0);
    let sameDirectionCoord;
    if (sign(cur - before) !== sign(after - cur)) {
      const diffInterval = [];
      if (sign(after - cur) === sign(range[1] - range[0])) {
        sameDirectionCoord = after;
        const curInRange = cur + range[1] - range[0];
        diffInterval[0] = Math.min(curInRange, (curInRange + before) / 2);
        diffInterval[1] = Math.max(curInRange, (curInRange + before) / 2);
      } else {
        sameDirectionCoord = before;
        const afterInRange = after + range[1] - range[0];
        diffInterval[0] = Math.min(cur, (afterInRange + cur) / 2);
        diffInterval[1] = Math.max(cur, (afterInRange + cur) / 2);
      }
      const sameInterval = [Math.min(cur, (sameDirectionCoord + cur) / 2), Math.max(cur, (sameDirectionCoord + cur) / 2)];
      if ((coordinate > sameInterval[0] && coordinate <= sameInterval[1]) || (coordinate >= diffInterval[0] && coordinate <= diffInterval[1])) {
        return i;
      }
    } else {
      const minValue = Math.min(before, after);
      const maxValue = Math.max(before, after);
      if (coordinate > (minValue + cur) / 2 && coordinate <= (maxValue + cur) / 2) {
        return i;
      }
    }
  }
  return -1;
}

/* formatAngleOfSector plus the angle test of inRangeOfSector. */
function inAngleRangeOfSector(angle, startAngle, endAngle) {
  const min = Math.min(Math.floor(startAngle / 360), Math.floor(endAngle / 360));
  const start = startAngle - min * 360;
  const end = endAngle - min * 360;
  let formatAngle = angle;
  if (start <= end) {
    while (formatAngle > end) formatAngle -= 360;
    while (formatAngle < start) formatAngle += 360;
    return formatAngle >= start && formatAngle <= end;
  }
  while (formatAngle > start) formatAngle -= 360;
  while (formatAngle < end) formatAngle += 360;
  return formatAngle >= end && formatAngle <= start;
}

/* calculateActiveTickIndex for ticks that run in a single direction. */
function activeTickIndex(coordinate, ticks) {
  const len = ticks.length;
  if (len <= 1) return 0;
  for (let i = 0; i < len; i++) {
    if (
      (i === 0 && coordinate <= (ticks[i] + ticks[i + 1]) / 2) ||
      (i > 0 && i < len - 1 && coordinate > (ticks[i] + ticks[i - 1]) / 2 && coordinate <= (ticks[i] + ticks[i + 1]) / 2) ||
      (i === len - 1 && coordinate > (ticks[i] + ticks[i - 1]) / 2)
    ) {
      return i;
    }
  }
  return -1;
}

/* getPolygonPath of Recharts' PolarGrid. */
function polarPolygonPath(radius, cx, cy, angles) {
  let path = "";
  angles.forEach((angle, i) => {
    const p = polarToCartesian(cx, cy, radius, angle);
    path += (i ? "L " : "M ") + fmtF(p.x) + "," + fmtF(p.y);
  });
  return path + "Z";
}

/* PolarGrid: ConcentricCircle and ConcentricPolygon carry the radius twice
 * like Recharts does, PolarAngles runs the radial lines from the inner to
 * the outer radius. The stroke defaults to Recharts' "#ccc", the demos
 * that paint their rings through a class pass "none" instead. */
function polarGridSVG(polar, cx, cy, innerRadius, outerRadius, radii, angles) {
  const stroke = polar.stroke || "#ccc";
  const strokeWidth = polar.strokeWidth ? ` stroke-width="${fmtF(polar.strokeWidth)}"` : "";
  const cls = polar.gridClass ? " " + polar.gridClass : "";
  let svg = `<g class="recharts-polar-grid"><g class="recharts-polar-grid-concentric">`;
  for (const r of radii) {
    if (polar.gridType === "circle") {
      svg += `<circle class="recharts-polar-grid-concentric-circle${cls}" stroke="${stroke}" fill="none"${strokeWidth} cx="${fmtF(cx)}" cy="${fmtF(cy)}" radius="${fmtF(r)}" r="${fmtF(r)}"/>`;
    } else {
      svg += `<path class="recharts-polar-grid-concentric-polygon${cls}" stroke="${stroke}" fill="none"${strokeWidth} d="${polarPolygonPath(r, cx, cy, angles)}"/>`;
    }
  }
  svg += `</g>`;
  if (polar.radialLines) {
    svg += `<g class="recharts-polar-grid-angle">`;
    for (const a of angles) {
      const start = polarToCartesian(cx, cy, innerRadius, a);
      const end = polarToCartesian(cx, cy, outerRadius, a);
      svg += `<line stroke="${stroke}"${strokeWidth} x1="${fmtF(start.x)}" y1="${fmtF(start.y)}" x2="${fmtF(end.x)}" y2="${fmtF(end.y)}"/>`;
    }
    svg += `</g>`;
  }
  return svg + `</g>`;
}

/* The Label content of the demos: a text in the middle of the chart with
 * one tspan per line, each at its own offset off the center. */
function centerLabelSVG(cx, cy, label) {
  const baseline = label.dominantBaseline ? ` dominant-baseline="${label.dominantBaseline}"` : "";
  let svg = `<text x="${fmtF(cx)}" y="${fmtF(cy)}" text-anchor="middle"${baseline}>`;
  for (const span of label.spans || []) {
    const cls = span.class ? ` class="${span.class}"` : "";
    svg += `<tspan x="${fmtF(cx)}" y="${fmtF(cy + (span.offsetY || 0))}"${cls}>${span.text}</tspan>`;
  }
  return svg + `</text>`;
}

/* renderRadar draws a RadarChart: the polar grid, the angle axis labels and
 * one polygon per series. The geometry follows RadarChart's defaults, a
 * start angle of 90 running to -270 and an outer radius of 80%. */
function renderRadar(panel, m, state, alpha = 1) {
  const W = panel.clientWidth;
  const H = panel.clientHeight;
  if (!W || !H) return;
  const legendHeight = legendSize(panel, m);
  const offsetW = Math.max(W - m.marginLeft - m.marginRight, 0);
  const offsetH = Math.max(H - m.marginTop - m.marginBottom - legendHeight, 0);
  const cx = m.marginLeft + offsetW / 2;
  const cy = m.marginTop + offsetH / 2;
  const maxRadius = Math.min(offsetW, offsetH) / 2;
  const outerRadius = maxRadius * 0.8;
  const n = m.series.length ? m.series[0].values.length : 0;
  if (!n) return;

  // The angle axis is a band scale from 90 to -270, one tick per row.
  const step = -360 / n;
  const angles = Array.from({ length: n }, (_, i) => 90 + step * i);
  const ticks = domainTicks(m, m.tickCount || 5);
  const domainMax = ticks[ticks.length - 1];
  const polar = m.polar || {};
  const radii = polar.polarRadius && polar.polarRadius.length ? polar.polarRadius : ticks.map((t) => (t / domainMax) * outerRadius);

  let svg = `<svg class="recharts-surface" width="${fmtF(W)}" height="${fmtF(H)}" viewBox="0 0 ${fmtF(W)} ${fmtF(H)}">`;

  if (polar.hasGrid) {
    svg += polarGridSVG(polar, cx, cy, 0, outerRadius, radii, angles);
  }

  if (polar.hasAngleAxis) {
    // getTickLineCoord with the default tickSize of 8 and the outer
    // orientation, plus getTickTextAnchor and getTickTextVerticalAnchor.
    const eps = 1e-5;
    const COS_45 = Math.cos((45 * Math.PI) / 180);
    svg += `<g class="recharts-polar-angle-axis recharts-axis">`;
    // AxisLine: a polygon through the ticks at the outer radius, the
    // default axisLineType of "polygon".
    svg += `<path class="recharts-polygon recharts-polar-angle-axis-line" fill="none" d="${polarPolygonPath(outerRadius, cx, cy, angles)}"/>`;
    svg += `<g class="recharts-polar-angle-axis-ticks">`;
    for (let i = 0; i < n; i++) {
      const coord = angles[i];
      const p = polarToCartesian(cx, cy, outerRadius + 8, coord);
      const cos = Math.cos((-coord * Math.PI) / 180);
      const sin = Math.sin((-coord * Math.PI) / 180);
      const anchor = cos > eps ? "start" : cos < -eps ? "end" : "middle";
      const vAnchor = Math.abs(cos) <= COS_45 ? (sin > 0 ? "start" : "end") : "middle";
      // getTickLineCoord: from the axis out by the default tickSize of 8.
      const p1 = polarToCartesian(cx, cy, outerRadius, coord);
      svg += `<line class="recharts-polar-angle-axis-tick-line" fill="none" x1="${fmtF(p1.x)}" y1="${fmtF(p1.y)}" x2="${fmtF(p.x)}" y2="${fmtF(p.y)}"/>`;
      const custom = polar.ticks && polar.ticks[i];
      if (custom) {
        const y = p.y + (custom.offsetY || 0);
        const fs = custom.fontSize ? ` font-size="${fmtF(custom.fontSize)}"` : "";
        const fw = custom.fontWeight ? ` font-weight="${custom.fontWeight}"` : "";
        svg += `<text class="recharts-text recharts-polar-angle-axis-tick-value" x="${fmtF(p.x)}" y="${fmtF(y)}" text-anchor="${anchor}"${fs}${fw} fill="currentColor">`;
        for (const span of custom.spans) {
          const attrs =
            (span.resetX ? ` x="${fmtF(p.x)}"` : "") +
            (span.dy ? ` dy="${span.dy}"` : "") +
            (span.fontSize ? ` font-size="${fmtF(span.fontSize)}"` : "") +
            (span.class ? ` class="${span.class}"` : "");
          svg += `<tspan${attrs}>${span.text}</tspan>`;
        }
        svg += `</text>`;
      } else {
        svg += `<text class="recharts-text recharts-polar-angle-axis-tick-value" x="${fmtF(p.x)}" y="${fmtF(p.y)}" text-anchor="${anchor}" fill="#666"><tspan dy="${verticalAnchorDy(vAnchor)}">${m.labels[i]}</tspan></text>`;
      }
    }
    svg += `</g></g>`;
  }

  state.tops = [];
  state.points = { radar: [] };
  const morph = state.morph;
  for (let si = 0; si < m.series.length; si++) {
    const s = m.series[si];
    // interpolatePolarPoint: the points grow out of the center on mount and
    // interpolate from the previous points on an update.
    const prev = morph && morph.prev && morph.prev.radar ? morph.prev.radar[si] : null;
    const factor = prev ? prev.length / s.values.length : 0;
    const pts = s.values.map((v, i) => {
      const target = polarToCartesian(cx, cy, (v / domainMax) * outerRadius, angles[i]);
      if (morph) {
        const p = prev && prev[Math.floor(i * factor)];
        if (p) return { x: interpolate(p.x, target.x, morph.t), y: interpolate(p.y, target.y, morph.t) };
        return { x: interpolate(cx, target.x, morph.t), y: interpolate(cy, target.y, morph.t) };
      }
      if (alpha < 1) {
        return { x: interpolate(cx, target.x, alpha), y: interpolate(cy, target.y, alpha) };
      }
      return target;
    });
    const d = pts.map((p, i) => (i ? "L" : "M") + fmtF(p.x) + "," + fmtF(p.y)).join("") + "Z";
    // filterProps only forwards the props that are set, so an unset fill
    // opacity leaves the SVG default of 1 in place.
    const fillOpacity = s.fillOpacityPtr != null ? ` fill-opacity="${fmtF(s.fillOpacityPtr)}"` : "";
    const stroke = s.stroke ? ` stroke="${s.stroke}"` : "";
    const strokeWidth = s.strokeWidth ? ` stroke-width="${fmtF(s.strokeWidth)}"` : "";
    svg +=
      `<g class="recharts-layer recharts-radar">` +
      `<g class="recharts-radar-polygon">` +
      `<path class="recharts-polygon" fill="${s.fill || s.color}"${fillOpacity}${stroke}${strokeWidth} d="${d}"/>`;
    // StaticPolygon renders the dots together with the polygon, so they
    // travel with it during the animation.
    if (s.dot) {
      svg += `<g class="recharts-radar-dots">`;
      for (const p of pts) {
        const dotOpacity = s.dot.fillOpacity ? ` fill-opacity="${fmtF(s.dot.fillOpacity)}"` : "";
        svg += `<circle class="recharts-dot recharts-radar-dot" r="${fmtF(s.dot.r || 3)}" fill="${s.dot.fill || s.fill || s.color}"${dotOpacity}${stroke} cx="${fmtF(p.x)}" cy="${fmtF(p.y)}"/>`;
      }
      svg += `</g>`;
    }
    svg += `</g></g>`;
    state.tops.push(pts.map((p) => p.y));
    state.points.radar.push(pts);
  }

  svg += "</svg>";
  swapSVG(panel, svg);
  state.geom = { W, H, cx, cy, outerRadius, angles, n };
}

/* tickSpec and ticks of d3-array: the angle axis of a radial chart has no
 * tick count of its own, so its grid angles are d3's default ten. */
function d3TickSpec(start, stop, count) {
  const e10 = Math.sqrt(50);
  const e5 = Math.sqrt(10);
  const e2 = Math.sqrt(2);
  const step = (stop - start) / Math.max(0, count);
  const power = Math.floor(Math.log10(step));
  const error = step / Math.pow(10, power);
  const factor = error >= e10 ? 10 : error >= e5 ? 5 : error >= e2 ? 2 : 1;
  let i1, i2, inc;
  if (power < 0) {
    inc = Math.pow(10, -power) / factor;
    i1 = Math.round(start * inc);
    i2 = Math.round(stop * inc);
    if (i1 / inc < start) ++i1;
    if (i2 / inc > stop) --i2;
    inc = -inc;
  } else {
    inc = Math.pow(10, power) * factor;
    i1 = Math.round(start / inc);
    i2 = Math.round(stop / inc);
    if (i1 * inc < start) ++i1;
    if (i2 * inc > stop) --i2;
  }
  if (i2 < i1 && 0.5 <= count && count < 2) return d3TickSpec(start, stop, count * 2);
  return [i1, i2, inc];
}

function d3Ticks(start, stop, count) {
  if (!(count > 0)) return [];
  if (start === stop) return [start];
  const reverse = stop < start;
  const [i1, i2, inc] = reverse ? d3TickSpec(stop, start, count) : d3TickSpec(start, stop, count);
  if (!(i2 >= i1)) return [];
  const n = i2 - i1 + 1;
  const out = new Array(n);
  if (reverse) {
    if (inc < 0) for (let i = 0; i < n; ++i) out[i] = (i2 - i) / -inc;
    else for (let i = 0; i < n; ++i) out[i] = (i2 - i) * inc;
  } else {
    if (inc < 0) for (let i = 0; i < n; ++i) out[i] = (i1 + i) / -inc;
    else for (let i = 0; i < n; ++i) out[i] = (i1 + i) * inc;
  }
  return out;
}

/* getBarPosition of Recharts for the chart defaults, a bar gap of 4 and a
 * bar category gap of 10% of the band. The size is truncated to whole
 * pixels, which is Recharts' own ">>= 0". */
function barPosition(bandSize, len) {
  let realBarGap = 4;
  const offset = 0.1 * bandSize;
  if (bandSize - 2 * offset - (len - 1) * realBarGap <= 0) realBarGap = 0;
  let originalSize = (bandSize - 2 * offset - (len - 1) * realBarGap) / len;
  if (originalSize > 1) originalSize = Math.trunc(originalSize);
  return { offset, size: originalSize, gap: realBarGap };
}

/* truncateByDomain of Recharts: a stacked range is clamped into the number
 * axis domain on both ends. */
function truncateByDomain(value, domainMin, domainMax) {
  const minValue = Math.min(domainMin, domainMax);
  const maxValue = Math.max(domainMin, domainMax);
  const result = [value[0], value[1]];
  if (value[0] < minValue) result[0] = minValue;
  if (value[1] > maxValue) result[1] = maxValue;
  if (result[0] > maxValue) result[0] = maxValue;
  if (result[1] < minValue) result[1] = minValue;
  return result;
}

/* getTangentCircle of Recharts' Sector: the circle a rounded corner runs
 * on, with the two points it is tangent to. */
function tangentCircle({ cx, cy, radius, angle, sign, isExternal, cornerRadius, cornerIsExternal }) {
  const RADIAN = Math.PI / 180;
  const centerRadius = cornerRadius * (isExternal ? 1 : -1) + radius;
  const theta = Math.asin(cornerRadius / centerRadius) / RADIAN;
  const centerAngle = cornerIsExternal ? angle : angle + sign * theta;
  const center = polarToCartesian(cx, cy, centerRadius, centerAngle);
  const circleTangency = polarToCartesian(cx, cy, radius, centerAngle);
  const lineTangencyAngle = cornerIsExternal ? angle - sign * theta : angle;
  const lineTangency = polarToCartesian(cx, cy, centerRadius * Math.cos(theta * RADIAN), lineTangencyAngle);
  return { center, circleTangency, lineTangency, theta };
}

/* getSectorWithCorner of Recharts' Sector. */
function sectorWithCornerPath(cx, cy, innerR, outerR, cornerRadius, startAngle, endAngle) {
  const sign = endAngle - startAngle < 0 ? -1 : endAngle - startAngle > 0 ? 1 : 0;
  const { circleTangency: soct, lineTangency: solt, theta: sot } = tangentCircle({ cx, cy, radius: outerR, angle: startAngle, sign, cornerRadius });
  const { circleTangency: eoct, lineTangency: eolt, theta: eot } = tangentCircle({ cx, cy, radius: outerR, angle: endAngle, sign: -sign, cornerRadius });
  const outerArcAngle = Math.abs(startAngle - endAngle) - sot - eot;
  if (outerArcAngle < 0) {
    return sectorPath(cx, cy, innerR, outerR, startAngle, endAngle);
  }
  let path =
    `M ${fmtF(solt.x)},${fmtF(solt.y)} A${fmtF(cornerRadius)},${fmtF(cornerRadius)},0,0,${sign < 0 ? 1 : 0},${fmtF(soct.x)},${fmtF(soct.y)}` +
    ` A${fmtF(outerR)},${fmtF(outerR)},0,${outerArcAngle > 180 ? 1 : 0},${sign < 0 ? 1 : 0},${fmtF(eoct.x)},${fmtF(eoct.y)}` +
    ` A${fmtF(cornerRadius)},${fmtF(cornerRadius)},0,0,${sign < 0 ? 1 : 0},${fmtF(eolt.x)},${fmtF(eolt.y)}`;
  if (innerR > 0) {
    const { circleTangency: sict, lineTangency: silt, theta: sit } = tangentCircle({ cx, cy, radius: innerR, angle: startAngle, sign, isExternal: true, cornerRadius });
    const { circleTangency: eict, lineTangency: eilt, theta: eit } = tangentCircle({ cx, cy, radius: innerR, angle: endAngle, sign: -sign, isExternal: true, cornerRadius });
    const innerArcAngle = Math.abs(startAngle - endAngle) - sit - eit;
    if (innerArcAngle < 0 && cornerRadius === 0) {
      return `${path}L${fmtF(cx)},${fmtF(cy)}Z`;
    }
    path +=
      `L${fmtF(eilt.x)},${fmtF(eilt.y)} A${fmtF(cornerRadius)},${fmtF(cornerRadius)},0,0,${sign < 0 ? 1 : 0},${fmtF(eict.x)},${fmtF(eict.y)}` +
      ` A${fmtF(innerR)},${fmtF(innerR)},0,${innerArcAngle > 180 ? 1 : 0},${sign > 0 ? 1 : 0},${fmtF(sict.x)},${fmtF(sict.y)}` +
      ` A${fmtF(cornerRadius)},${fmtF(cornerRadius)},0,0,${sign < 0 ? 1 : 0},${fmtF(silt.x)},${fmtF(silt.y)}Z`;
  } else {
    path += `L${fmtF(cx)},${fmtF(cy)}Z`;
  }
  return path;
}

/* Sector of Recharts: a corner radius bends the ends, and it is capped at
 * half the ring width. */
function sector(cx, cy, innerR, outerR, startAngle, endAngle, cornerRadius) {
  if (outerR < innerR || startAngle === endAngle) return "";
  const deltaRadius = outerR - innerR;
  const cr = cornerRadius || 0;
  if (cr > 0 && Math.abs(startAngle - endAngle) < 360) {
    return sectorWithCornerPath(cx, cy, innerR, outerR, Math.min(cr, deltaRadius / 2), startAngle, endAngle);
  }
  return sectorPath(cx, cy, innerR, outerR, startAngle, endAngle);
}

/* getSectorPath of Recharts' Sector. */
function sectorPath(cx, cy, innerR, outerR, startAngle, endAngle) {
  // getDeltaAngle stops just short of a full turn, so a sector that goes
  // all the way around still has two distinct arc ends and paints.
  const sign = endAngle - startAngle < 0 ? -1 : 1;
  const angle = Math.min(Math.abs(endAngle - startAngle), 359.999) * sign;
  const tempEndAngle = startAngle + angle;
  const outerStart = polarToCartesian(cx, cy, outerR, startAngle);
  const outerEnd = polarToCartesian(cx, cy, outerR, tempEndAngle);
  const large = Math.abs(angle) > 180 ? 1 : 0;
  let path =
    `M ${fmtF(outerStart.x)},${fmtF(outerStart.y)} A ${fmtF(outerR)},${fmtF(outerR)},0,${large},` +
    `${startAngle > tempEndAngle ? 1 : 0},${fmtF(outerEnd.x)},${fmtF(outerEnd.y)}`;
  if (innerR > 0) {
    const innerStart = polarToCartesian(cx, cy, innerR, startAngle);
    const innerEnd = polarToCartesian(cx, cy, innerR, tempEndAngle);
    path +=
      `L ${fmtF(innerEnd.x)},${fmtF(innerEnd.y)} A ${fmtF(innerR)},${fmtF(innerR)},0,${large},` +
      `${startAngle <= tempEndAngle ? 1 : 0},${fmtF(innerStart.x)},${fmtF(innerStart.y)} Z`;
  } else {
    path += `L ${fmtF(cx)},${fmtF(cy)} Z`;
  }
  return path;
}

/* getTextAnchor of Pie's labels. */
function pieTextAnchor(x, cx) {
  if (x > cx) return "start";
  if (x < cx) return "end";
  return "middle";
}

const PIE_LABEL_OFFSET = 20;

function renderPie(panel, m, state, alpha = 1) {
  const W = panel.clientWidth;
  const H = panel.clientHeight;
  if (!W || !H) return;
  // The Pie defaults: centered in the offset box, 80% of its radius. The
  // legend adds to the bottom offset, so it shrinks the pie instead of
  // covering it.
  const margin = 5;
  const offsetW = Math.max(W - 2 * margin, 0);
  const offsetH = Math.max(H - 2 * margin - legendSize(panel, m), 0);
  const cx = margin + offsetW / 2;
  const cy = margin + offsetH / 2;
  const maxR = Math.min(offsetW, offsetH) / 2;

  let svg = `<svg class="recharts-surface" width="${fmtF(W)}" height="${fmtF(H)}" viewBox="0 0 ${fmtF(W)} ${fmtF(H)}">`;
  state.points = { sectors: [] };

  (m.pies || []).forEach((pie, pi) => {
    const outerR = pie.outerRadius || maxR * 0.8;
    const innerR = pie.innerRadius || 0;
    const total = pie.values.reduce((a, b) => a + b, 0);
    const stroke = pie.stroke === "0" ? "" : ` stroke="${pie.stroke || "#fff"}"`;
    const strokeWidth = pie.strokeWidth ? ` stroke-width="${fmtF(pie.strokeWidth)}"` : "";
    const sectors = [];
    // The Pie animation: every sector interpolates its own angle and they
    // chain. On mount it starts at zero, on an update it starts at the
    // previous sector's angle.
    const morph = state.morph;
    const prevSectors = morph && morph.prev && morph.prev.sectors ? morph.prev.sectors[pi] : null;
    let angle = 0;
    for (let i = 0; i < pie.values.length; i++) {
      const target = (pie.values[i] / total) * 360 * alpha;
      let sweep = target;
      if (prevSectors && prevSectors[i]) {
        sweep = interpolate(prevSectors[i].end - prevSectors[i].start, target, morph.t);
      }
      sectors.push({ start: angle, end: angle + sweep, mid: angle + sweep / 2 });
      angle += sweep;
    }

    svg += `<g class="recharts-layer recharts-pie">`;
    for (let i = 0; i < sectors.length; i++) {
      const sc = sectors[i];
      const fill = pie.colors[i];
      const active = pie.activeIndex != null && pie.activeIndex === i && pie.activeShape && pie.activeShape.length;
      const shapes = active
        ? pie.activeShape.map((sp) => ({ inner: sp.InnerRadius ? outerR + sp.InnerRadius : innerR, outer: outerR + (sp.OuterRadius || 0) }))
        : [{ inner: innerR, outer: outerR }];
      svg += `<g class="recharts-layer recharts-pie-sector">`;
      for (const sh of shapes) {
        svg += `<path class="recharts-sector"${stroke}${strokeWidth} fill="${fill}" data-tui-chart-pie="${pi}" data-tui-chart-sector="${i}" d="${sectorPath(cx, cy, sh.inner, sh.outer, sc.start, sc.end)}"/>`;
      }
      svg += `</g>`;
    }

    // PieLabels: the label sits offsetRadius past the sector, the line
    // runs from the sector edge to it.
    if (alpha >= 1 && pie.label) {
      svg += `<g class="recharts-layer recharts-pie-labels">`;
      for (let i = 0; i < sectors.length; i++) {
        const mid = sectors[i].mid;
        const endPoint = polarToCartesian(cx, cy, outerR + PIE_LABEL_OFFSET, mid);
        const fill = pie.label.fill || pie.colors[i];
        if (pie.labelLine) {
          const startPoint = polarToCartesian(cx, cy, outerR, mid);
          svg += `<path class="recharts-curve recharts-pie-label-line" stroke="${pie.colors[i]}" fill="none" d="M${fmtF(startPoint.x)},${fmtF(startPoint.y)}L${fmtF(endPoint.x)},${fmtF(endPoint.y)}"/>`;
        }
        svg += `<text class="recharts-text recharts-pie-label-text" x="${fmtF(endPoint.x)}" y="${fmtF(endPoint.y)}" fill="${fill}" text-anchor="${pieTextAnchor(endPoint.x, cx)}" alignment-baseline="middle">${fmtF(pie.values[i])}</text>`;
      }
      svg += `</g>`;
    }

    // A LabelList on a Pie is a polar label: it sits at the middle radius
    // of its sector.
    if (alpha >= 1 && pie.labelList) {
      const ll = pie.labelList;
      svg += `<g class="recharts-layer recharts-label-list">`;
      for (let i = 0; i < sectors.length; i++) {
        const r = (innerR + outerR) / 2;
        const pt = polarToCartesian(cx, cy, r, sectors[i].mid);
        svg += `<text class="recharts-text recharts-label ${ll.class || ""}" x="${fmtF(pt.x)}" y="${fmtF(pt.y)}" text-anchor="middle" font-size="${fmtF(ll.fontSize || 12)}"><tspan dy="0.355em">${ll.labels[i]}</tspan></text>`;
      }
      svg += `</g>`;
    }

    if (pie.center) {
      svg += centerLabelSVG(cx, cy, pie.center);
    }
    svg += "</g>";
    state.points.sectors.push(sectors);
  });

  svg += "</svg>";
  swapSVG(panel, svg);
  state.geom = { W, H };
}

/* renderRadialLabel of Recharts' Label: an insideStart label runs along an
 * arc through the middle of its own sector. */
function radialLabelSVG(id, text, ll, fill, cx, cy, sc) {
  const radius = (sc.inner + sc.outer) / 2;
  // getDeltaAngle, then the insideStart branch with the default offset of 5.
  const delta = (sc.end - sc.start < 0 ? -1 : 1) * Math.min(Math.abs(sc.end - sc.start), 360);
  const sign = delta >= 0 ? 1 : -1;
  const labelAngle = sc.start + sign * (ll.offset || 5);
  // clockWise is false on a radial bar's view box, and a positive sweep
  // flips it.
  const direction = delta <= 0 ? false : true;
  const startPoint = polarToCartesian(cx, cy, radius, labelAngle);
  const endPoint = polarToCartesian(cx, cy, radius, labelAngle + (direction ? 1 : -1) * 359);
  const path = `M${fmtF(startPoint.x)},${fmtF(startPoint.y)} A${fmtF(radius)},${fmtF(radius)},0,1,${direction ? 0 : 1}, ${fmtF(endPoint.x)},${fmtF(endPoint.y)}`;
  const fontSize = ll.fontSize ? ` font-size="${fmtF(ll.fontSize)}"` : "";
  return (
    `<text fill="${fill}"${fontSize} dominant-baseline="central" class="recharts-radial-bar-label${ll.class ? " " + ll.class : ""}">` +
    `<defs><path id="${id}" d="${path}"/></defs><textPath xlink:href="#${id}">${text}</textPath></text>`
  );
}

/* renderRadial draws a RadialBarChart: the radius axis is a band scale over
 * the rings, the angle axis a linear scale over the values. */
function renderRadial(panel, m, state, alpha = 1) {
  const W = panel.clientWidth;
  const H = panel.clientHeight;
  if (!W || !H) return;
  const legendHeight = legendSize(panel, m);
  const offsetW = Math.max(W - m.marginLeft - m.marginRight, 0);
  const offsetH = Math.max(H - m.marginTop - m.marginBottom - legendHeight, 0);
  const cx = m.marginLeft + offsetW / 2;
  const cy = m.marginTop + offsetH / 2;
  // getMaxRadius, then the RadialBarChart defaults: no inner radius and an
  // outer radius of 80%.
  const maxRadius = Math.min(offsetW, offsetH) / 2;
  const rad = m.radial || {};
  const innerRadius = rad.innerRadius || 0;
  const outerRadius = rad.outerRadius || maxRadius * 0.8;
  const startAngle = rad.startAngle || 0;
  const endAngle = rad.endAngle;
  const n = m.series.length ? m.series[0].values.length : 0;
  if (!n) return;

  // The angle axis is a number axis with the [0, 'auto'] default domain, so
  // it spans zero to the largest raw value.
  let domainMin = 0;
  let domainMax = 0;
  for (const s of m.series) {
    for (const v of s.values) {
      if (v > domainMax) domainMax = v;
      if (v < domainMin) domainMin = v;
    }
  }
  const span = domainMax - domainMin || 1;
  const angleOf = (v) => startAngle + ((v - domainMin) / span) * (endAngle - startAngle);

  // The radius axis is a band scale, one band per row, and getBarPosition
  // places the bars inside it. Bars of one stack share their position.
  const bandSize = (outerRadius - innerRadius) / n;
  const groupKeys = [];
  const groupOf = m.series.map((s, si) => {
    const key = s.stackId ? "stack:" + s.stackId : "bar:" + si;
    let gi = groupKeys.indexOf(key);
    if (gi < 0) {
      gi = groupKeys.length;
      groupKeys.push(key);
    }
    return gi;
  });
  const pos = barPosition(bandSize, groupKeys.length);

  // A stack chains its ranges and truncateByDomain clamps each one into
  // the angle domain, so a stacked bar never runs past the chart's end
  // angle. An unstacked bar starts at the base value of the number axis,
  // zero.
  const totals = {};
  const ranges = m.series.map((s) => {
    const out = [];
    for (let i = 0; i < n; i++) {
      const v = s.values[i];
      if (s.stackId) {
        const key = s.stackId + "|" + i;
        const base = totals[key] || 0;
        out.push(truncateByDomain([base, base + v], domainMin, domainMax));
        totals[key] = base + v;
      } else {
        out.push([0, v]);
      }
    }
    return out;
  });

  let svg = `<svg class="recharts-surface" width="${fmtF(W)}" height="${fmtF(H)}" viewBox="0 0 ${fmtF(W)} ${fmtF(H)}">`;

  const polar = m.polar || {};
  if (polar.hasGrid) {
    // getTicksOfAxis for the grid: a band scale puts its ticks in the
    // middle of the band, the angle axis has no tick count of its own.
    const radii = polar.polarRadius && polar.polarRadius.length ? polar.polarRadius : Array.from({ length: n }, (_, i) => innerRadius + i * bandSize + bandSize / 2);
    const angles = d3Ticks(domainMin, domainMax, 10).map(angleOf);
    svg += polarGridSVG(polar, cx, cy, innerRadius, outerRadius, radii, angles);
  }

  const sectors = [];
  m.series.forEach((s, si) => {
    const barOffset = pos.offset + (pos.size + pos.gap) * groupOf[si];
    let background = "";
    let shapes = "";
    let labels = "";
    const bar = [];
    for (let i = 0; i < n; i++) {
      const inner = innerRadius + i * bandSize + barOffset;
      const outer = inner + pos.size;
      const from = angleOf(ranges[si][i][0]);
      const to = angleOf(ranges[si][i][1]);
      // The mount animation interpolates the end angle out of the start
      // angle, so a sector opens up.
      const end = alpha < 1 ? from + (to - from) * alpha : to;
      if (s.background) {
        background +=
          `<g class="recharts-layer recharts-shape">` +
          `<path class="recharts-sector recharts-radial-bar-background-sector" fill="#eee" d="${sector(cx, cy, inner, outer, startAngle, endAngle, s.cornerRadius)}"/>` +
          `</g>`;
      }
      // The entry's own fill wins over the bar's, like Recharts spreading
      // the data row over the sector props.
      const fill = (s.cells && s.cells[i]) || s.fill || s.color;
      shapes +=
        `<g class="recharts-layer recharts-shape">` +
        `<path class="recharts-sector recharts-radial-bar-sector" fill="${fill}" d="${sector(cx, cy, inner, outer, from, end, s.cornerRadius)}"/>` +
        `</g>`;
      bar.push({ inner, outer, start: from, end });
      // The label list only shows once the animation is done, Recharts'
      // showLabels={!isAnimating}.
      if (s.labelList && alpha >= 1) {
        labels += radialLabelSVG(`${state.uid}-${si}-${i}`, s.labelList.labels[i], s.labelList, fill, cx, cy, { inner, outer, start: from, end });
      }
    }
    sectors.push(bar);
    svg +=
      `<g class="recharts-layer recharts-area${s.class ? " " + s.class : ""}">` +
      (s.background ? `<g class="recharts-layer recharts-radial-bar-background">${background}</g>` : "") +
      `<g class="recharts-layer recharts-radial-bar-sectors">${shapes}${labels}</g>` +
      `</g>`;
  });

  if (rad.center) {
    svg += centerLabelSVG(cx, cy, rad.center);
  }

  svg += "</svg>";
  swapSVG(panel, svg);
  // The tooltip picks its row by the radius, so it needs the band centers.
  const tickCoords = Array.from({ length: n }, (_, i) => innerRadius + i * bandSize + bandSize / 2);
  state.geom = { W, H, cx, cy, innerRadius, outerRadius, startAngle, endAngle, tickCoords, sectors };
}

/* ---------------------------------------------------------------- */
/* Tooltip + cursor                                                 */
/* ---------------------------------------------------------------- */

function tooltipWrapper(container) {
  let wrapper = container.querySelector(":scope > .recharts-tooltip-wrapper");
  if (!wrapper) {
    wrapper = document.createElement("div");
    wrapper.className = "recharts-tooltip-wrapper";
    wrapper.style.cssText =
      "position:absolute;top:0;left:0;pointer-events:none;visibility:hidden;z-index:30;transition:transform 400ms ease";
    container.style.position = "relative";
    container.appendChild(wrapper);
  }
  return wrapper;
}

function indicatorHTML(indicator, color, nestLabel) {
  let cls = "shrink-0 rounded-[2px] border-(--color-border) bg-(--color-bg)";
  if (indicator === "line") cls += " w-1";
  else if (indicator === "dashed") cls += ` w-0 border-[1.5px] border-dashed bg-transparent${nestLabel ? " my-0.5" : ""}`;
  else cls += " h-2.5 w-2.5";
  return `<div class="${cls}" style="--color-bg:${color};--color-border:${color}"></div>`;
}

function tooltipHTML(m, i, pieIndex = 0) {
  const t = m.tooltip || {};
  // labelKey resolves the label through the config; a pie falls back to
  // the config label of its own data key, like getPayloadConfigFromPayload
  // reading item.dataKey.
  const pie = m.kind === "pie" ? m.pies[pieIndex] : null;
  const payloadCount = pie ? 1 : m.series.filter(s => !isGap(s, i) && !s.hidden).length;
  if (!payloadCount) return "";
  const label = pie ? pie.seriesLabel || t.label : t.label || (m.tooltipLabels && m.tooltipLabels[i]) || m.labels[i];
  // Like ChartTooltipContent: a single non-dot payload nests the label
  // inside the row, so the line indicator spans the full row height. A pie
  // always carries a single payload item.
  const nestLabel = (payloadCount === 1) && t.indicator && t.indicator !== "dot";
  const labelCls = `font-medium${t.labelClass ? " " + t.labelClass : ""}`;
  let html = `<div class="${TOOLTIP_CLASS}${t.width ? " " + t.width : ""}">`;
  if (!t.hideLabel && !nestLabel) {
    html += `<div class="${labelCls}">${label}</div>`;
  }
  html += `<div class="grid gap-1.5">`;
  if (pie) {
    const color = t.color || pie.colors[i];
    const rowCls =
      "flex w-full flex-wrap items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5 [&>svg]:text-muted-foreground" +
      (t.indicator !== "line" && t.indicator !== "dashed" ? " items-center" : "");
    const nested = nestLabel && !t.hideLabel ? `<div class="${labelCls}">${label}</div>` : "";
    html +=
      `<div class="${rowCls}">` +
      (t.hideIndicator ? "" : indicatorHTML(t.indicator, color, nestLabel)) +
      `<div class="flex flex-1 justify-between leading-none ${nestLabel ? "items-end" : "items-center"}">` +
      `<div class="grid gap-1.5">${nested}<span class="text-muted-foreground">${(pie.tooltipNames && pie.tooltipNames[i]) || pie.labels[i]}</span></div>` +
      `<span class="font-mono font-medium text-foreground tabular-nums">${pie.values[i].toLocaleString("en-US")}</span>` +
      `</div></div></div></div>`;
    return html;
  }
  m.series.forEach((s, si) => {
    if (isGap(s, i) || s.hidden) return;
    const rowCls =
      "flex w-full flex-wrap items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5 [&>svg]:text-muted-foreground" +
      (t.indicator !== "line" && t.indicator !== "dashed" ? " items-center" : "");
    // The formatter markup replaces the row's default indicator, name and
    // value, like ChartTooltipContent calling the formatter render prop.
    if (t.rows && t.rows[si]) {
      html += `<div class="${rowCls}">${t.rows[si][i]}</div>`;
      return;
    }
    const nested = nestLabel && !t.hideLabel ? `<div class="${labelCls}">${label}</div>` : "";
    // ChartTooltipContent's indicatorColor: the color prop wins, then the
    // row's own fill, then the series color, so per row colored bars keep
    // their swatch.
    const indicatorColor = t.color || (s.cells && s.cells[i]) || s.color;
    // getPayloadConfigFromPayload: a name key that the rows answer names
    // every row on its own, otherwise the series carries the name.
    const name = (s.tooltipNames && s.tooltipNames[i]) || s.label;
    html +=
      `<div class="${rowCls}">` +
      (s.icon || (t.hideIndicator ? "" : indicatorHTML(t.indicator, indicatorColor, nestLabel))) +
      `<div class="flex flex-1 justify-between leading-none ${nestLabel ? "items-end" : "items-center"}">` +
      `<div class="grid gap-1.5">${nested}<span class="text-muted-foreground">${name}</span></div>` +
      `<span class="font-mono font-medium text-foreground tabular-nums">${s.values[i].toLocaleString("en-US")}</span>` +
      `</div></div>`;
  });
  html += "</div></div>";
  return html;
}

function showCursor(panel, m, state, i) {
  const svg = panel.querySelector("svg.recharts-surface");
  if (!svg || m.cursor === false) return;
  let cursor = svg.querySelector(".recharts-tooltip-cursor");
  const g = state.geom;
  // Recharts draws the cursor between the grid and the series, so bars
  // and areas render on top of the hover band.
  const seriesLayer = svg.querySelector(".recharts-bar, .recharts-area, .recharts-line, .recharts-radar");
  if (m.kind === "radial") {
    // getRadialCursorPoints: the cursor is a sector of zero width, an arc
    // at the radius the pointer sits on.
    const d = sector(g.cx, g.cy, state.cursorRadius, state.cursorRadius, g.startAngle, g.endAngle, 0);
    if (!cursor) {
      seriesLayer.insertAdjacentHTML("beforebegin", `<g class="recharts-layer"><path class="recharts-sector recharts-tooltip-cursor" stroke="#ccc" fill="none" d="${d}"/></g>`);
    } else {
      cursor.setAttribute("d", d);
    }
    return;
  }
  if (m.kind === "radar") {
    const end = polarToCartesian(g.cx, g.cy, g.outerRadius, g.angles[i]);
    const d = `M${fmtF(g.cx)},${fmtF(g.cy)}L${fmtF(end.x)},${fmtF(end.y)}`;
    if (!cursor) {
      seriesLayer.insertAdjacentHTML("beforebegin", `<g class="recharts-layer"><path class="recharts-curve recharts-tooltip-cursor" stroke="#ccc" fill="none" d="${d}"/></g>`);
    } else {
      cursor.setAttribute("d", d);
    }
    return;
  }
  if (m.kind === "bar") {
    const d = g.vertical
      ? `M ${fmtF(g.plotX)},${fmtF(g.plotY + i * g.band)} h ${fmtF(g.plotW)} v ${fmtF(g.band)} h ${fmtF(-g.plotW)} Z`
      : `M ${fmtF(g.plotX + i * g.band)},${fmtF(g.plotY)} h ${fmtF(g.band)} v ${fmtF(g.plotH)} h ${fmtF(-g.band)} Z`;
    if (!cursor) {
      seriesLayer.insertAdjacentHTML(
        "beforebegin",
        `<g class="recharts-layer"><path class="recharts-rectangle recharts-tooltip-cursor" fill="#ccc" d="${d}"/></g>`
      );
    } else {
      cursor.setAttribute("d", d);
    }
  } else {
    const x = g.xs[i];
    const d = `M${fmtF(x)},${fmtF(g.plotY)}L${fmtF(x)},${fmtF(g.plotBottom)}`;
    if (!cursor) {
      seriesLayer.insertAdjacentHTML(
        "beforebegin",
        `<g class="recharts-layer"><path class="recharts-curve recharts-tooltip-cursor" stroke="#ccc" fill="none" stroke-width="1" d="${d}"/></g>`
      );
    } else {
      cursor.setAttribute("d", d);
    }
  }
}

function hideCursor(panel) {
  const cursor = panel.querySelector(".recharts-tooltip-cursor");
  if (cursor) cursor.parentElement.remove();
  hideActiveDots(panel);
}

// showActiveDots is Recharts' Area/Line activeDot: a dot per series on the
// active data point while the tooltip is up.
function showActiveDots(panel, m, state, i) {
  const svg = panel.querySelector("svg.recharts-surface");
  if (!svg || (m.kind !== "area" && m.kind !== "line" && m.kind !== "radar") || !state.tops) return;
  let layer = svg.querySelector(".recharts-active-dots");
  if (!layer) {
    svg.insertAdjacentHTML("beforeend", `<g class="recharts-layer recharts-active-dots"></g>`);
    layer = svg.querySelector(".recharts-active-dots");
  }
  let html = "";
  for (let s = 0; s < m.series.length; s++) {
    // renderActivePoint's defaults: r 4, white stroke of 2, filled with the
    // item's main color. getLegendItemColor prefers the stroke over the fill.
    const series = m.series[s];
    if (isGap(series, i) || series.hidden) continue;
    const r = series.activeDotR || 4;
    const mainColor = series.stroke && series.stroke !== "none" ? series.stroke : series.fill || series.color || "none";
    // A radar point carries its own x, the cartesian charts share the
    // category positions.
    const point = m.kind === "radar" ? state.points.radar[s][i] : { x: state.geom.xs[i], y: state.tops[s][i] };
    html += `<circle class="recharts-dot" r="${fmtF(r)}" stroke="#fff" stroke-width="2" fill="${mainColor}" cx="${fmtF(point.x)}" cy="${fmtF(point.y)}"/>`;
  }
  layer.innerHTML = html;
}

function hideActiveDots(panel) {
  const layer = panel.querySelector(".recharts-active-dots");
  if (layer) layer.remove();
}

/* ---------------------------------------------------------------- */
/* Wiring                                                           */
/* ---------------------------------------------------------------- */

const OFFSET = 10;

/* getTooltipTranslateXY: the tooltip sits after the coordinate, and flips
 * before it once it would leave the view box, clamped to the view box. */
function tooltipTranslate(coordinate, tooltipDimension, viewBoxKey, viewBoxDimension) {
  const negative = coordinate - tooltipDimension - (OFFSET > 0 ? OFFSET : 0);
  const positive = coordinate + OFFSET;
  const tooltipBoundary = positive + tooltipDimension;
  const viewBoxBoundary = viewBoxKey + viewBoxDimension;
  if (tooltipBoundary > viewBoxBoundary) {
    return Math.max(negative, viewBoxKey);
  }
  return Math.max(positive, viewBoxKey);
}

function initPanel(script) {
  if (script.dataset.tuiChartInit) return;
  script.dataset.tuiChartInit = "true";

  const panel = script.parentElement;
  const container = panel.closest("[data-tui-chart]");
  const m = JSON.parse(script.textContent);
  const state = { uid: "tui-chart-" + uid++ };

  const render = (alpha = 1) => {
    if (m.kind === "pie") renderPie(panel, m, state, alpha);
    else if (m.kind === "radar") renderRadar(panel, m, state, alpha);
    else if (m.kind === "radial") renderRadial(panel, m, state, alpha);
    else renderCartesian(panel, m, state, alpha);
    // The points this panel drew are what the next visible panel morphs
    // from, Recharts' previousPointsRef.
    if (state.points) container._tuiActivePoints = state.points;
    // Recharts renders the cursor and the active dots from the tooltip
    // state on every pass, so a hover keeps its overlays through the
    // entrance animation even though each frame rebuilds the surface.
    if (state.activeIndex != null) {
      showCursor(panel, m, state, state.activeIndex);
      showActiveDots(panel, m, state, state.activeIndex);
    }
    // The default tooltip waits for the first real layout of a panel that
    // mounted hidden.
    if (state.onFirstRender && state.geom) {
      const f = state.onFirstRender;
      state.onFirstRender = null;
      f();
    }
  };

  // On mount the entrance animation plays. When a hidden panel becomes
  // visible (range/series/month switches) Recharts morphs from the old
  // to the new values instead, so we interpolate from the previously
  // visible panel's model when the shapes line up. Plain resizes
  // re-render without animating.
  const enter = () => {
    const prev = container._tuiActive;
    const prevPoints = container._tuiActivePoints;
    container._tuiActive = m;
    const sameShape =
      m.kind === "pie"
        ? prev && prev.pies && m.pies && prev.pies.length === m.pies.length
        : prev && prev.series && m.series && prev.series.length === m.series.length;
    if (prev && prev !== m && prevPoints && prev.kind === m.kind && sameShape) {
      morphChart(panel, m, state, render, prevPoints);
    } else {
      animateChart(panel, m, state, render);
    }
  };
  if (panel.clientWidth) {
    state.mounted = true;
    enter();
  }
  const ro = new ResizeObserver(() => {
    const w = panel.clientWidth;
    if (!w) {
      state.mounted = false;
      return;
    }
    if (!state.mounted) {
      state.mounted = true;
      enter();
    } else if (!state.geom || w !== state.geom.W) {
      // Real container resizes re-render statically. state.geom.W is
      // updated on every animation frame, so a late observer callback
      // never stomps into a running animation.
      render(1);
    }
  });
  ro.observe(panel);

  // Without a declared Tooltip child Recharts renders no tooltip, no
  // active dots and no cursor, so none of the hover wiring applies.
  if (!m.hasTooltip) return;

  const wrapper = tooltipWrapper(container);

  // TooltipBoundingBox: Escape dismisses the tooltip box at its current
  // coordinate; the cursor and the active dots stay up, and the box comes
  // back as soon as the coordinate changes.
  state.dismissed = false;
  state.dismissedAt = { x: 0, y: 0 };
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    state.dismissed = true;
    state.dismissedAt = state.tooltipCoord || { x: 0, y: 0 };
    wrapper.style.visibility = "hidden";
  });

  // Like Recharts' inRange: the tooltip only activates while the pointer
  // is inside the plot rectangle, not over the axis labels below.
  const activeIndexAt = (chartX, chartY) => {
    const g = state.geom;
    if (!g) return -1;
    if (m.kind === "radar") {
      // inRangeOfSector: only inside the outer radius, then the angle
      // decides which tick is active.
      const p = angleOfPoint(chartX, chartY, g.cx, g.cy);
      if (p.radius > g.outerRadius) return -1;
      // The angles run from 90 downwards, the point angle from 0 to 360.
      const angle = p.angle > 90 ? p.angle - 360 : p.angle;
      return activeAngleIndex(angle, g.angles);
    }
    if (m.kind === "radial") {
      // inRangeOfSector, then calculateTooltipPos: in a radial layout the
      // radius picks the row.
      const p = angleOfPoint(chartX, chartY, g.cx, g.cy);
      if (p.radius < g.innerRadius || p.radius > g.outerRadius || p.radius === 0) return -1;
      if (!inAngleRangeOfSector(p.angle, g.startAngle, g.endAngle)) return -1;
      state.cursorRadius = p.radius;
      return activeTickIndex(p.radius, g.tickCoords);
    }
    if (chartX < g.plotX || chartX > g.plotX + g.plotW) return -1;
    if (chartY < g.plotY || chartY > g.plotBottom) return -1;
    if (m.kind === "bar") {
      // The category runs down the y axis in a vertical layout.
      const along = g.vertical ? chartY - g.plotY : chartX - g.plotX;
      return Math.max(0, Math.min(g.n - 1, Math.floor(along / g.band)));
    }
    const step = g.plotW / (g.n - 1);
    return Math.max(0, Math.min(g.n - 1, Math.round((chartX - g.plotX) / step)));
  };

  // parseEventsOfWrapper: the tooltip listens to mouse events, and an axis
  // tooltip additionally to touchmove, whose handleTouchMove feeds the
  // changed touch into the mouse handler. A touch tap shows the tooltip
  // through the browser's compatibility mousemove and it stays until a tap
  // elsewhere fires mouseleave; a finger dragged across the plot keeps
  // scrubbing through touchmove even while the page scrolls. An item
  // tooltip (pie) attaches no wrapper touch events.
  const handleMouseMove = (e) => {
    if (m.kind === "pie") {
      const sector = e.target.closest(".recharts-sector");
      const idx = sector ? parseInt(sector.getAttribute("data-tui-chart-sector") || "-1", 10) : -1;
      if (idx < 0) {
        wrapper.style.visibility = "hidden";
        return;
      }
      positionTooltip(e, null, null, idx, parseInt(sector.getAttribute("data-tui-chart-pie") || "0", 10));
      return;
    }
    const rect = panel.getBoundingClientRect();
    const chartX = e.clientX - rect.left;
    const chartY = e.clientY - rect.top;
    const i = activeIndexAt(chartX, chartY);
    state.hoverActive = i >= 0;
    if (i < 0) {
      resolveTooltip();
      return;
    }
    state.activeIndex = i;
    showCursor(panel, m, state, i);
    showActiveDots(panel, m, state, i);
    // getActiveCoordinate: the category axis snaps to its tick and the
    // other one follows the pointer, so a vertical layout snaps y.
    const g = state.geom;
    if (m.kind === "radar" || m.kind === "radial") {
      positionTooltip(e, null, null, i);
      return;
    }
    const snap = g ? g.cats[i] : null;
    positionTooltip(e, g && g.vertical ? null : snap, g && g.vertical ? snap : null, i);
  };
  panel.addEventListener("mousemove", handleMouseMove);
  if (m.kind !== "pie") {
    panel.addEventListener("touchmove", (e) => {
      if (e.changedTouches != null && e.changedTouches.length > 0) {
        handleMouseMove(e.changedTouches[0]);
      }
    });
  }

  function positionTooltip(e, snapX, snapY, i, pieIndex = 0) {
    const wasHidden = wrapper.style.visibility !== "visible";
    wrapper.innerHTML = tooltipHTML(m, i, pieIndex);
    wrapper.style.visibility = wrapper.innerHTML ? "visible" : "hidden";
    const crect = container.getBoundingClientRect();
    const tw = wrapper.offsetWidth;
    const th = wrapper.offsetHeight;
    const prect = panel.getBoundingClientRect();
    const px = snapX != null ? snapX + (prect.left - crect.left) : e.clientX - crect.left;
    const py = snapY != null ? snapY + (prect.top - crect.top) : e.clientY - crect.top;
    // A dismissed tooltip stays hidden until its coordinate changes.
    if (state.dismissed) {
      if (px === state.dismissedAt.x && py === state.dismissedAt.y) {
        wrapper.style.visibility = "hidden";
      } else {
        state.dismissed = false;
      }
    }
    state.tooltipCoord = { x: px, y: py };
    const tx = tooltipTranslate(px, tw, 0, crect.width);
    const ty = tooltipTranslate(py, th, 0, crect.height);
    if (wasHidden) {
      // Appear in place like Recharts, the transition only trails while
      // the tooltip is already visible.
      wrapper.style.transition = "none";
      wrapper.style.transform = `translate(${tx}px, ${ty}px)`;
      void wrapper.offsetHeight;
      wrapper.style.transition = "transform 400ms ease";
      return;
    }
    wrapper.style.transform = `translate(${tx}px, ${ty}px)`;
  }

  panel.addEventListener("mouseleave", () => {
    state.hoverActive = false;
    resolveTooltip();
  });

  // displayDefaultTooltip: a Tooltip with a defaultIndex shows once on
  // mount, at the category's tick coordinate and halfway between the plot
  // top and the chart height, Recharts' (offset.top + height) / 2.
  const di = m.tooltip && m.tooltip.defaultIndex;
  if (typeof di === "number") {
    const show = () => {
      const g = state.geom;
      if (!g || !g.cats || di < 0 || di > g.cats.length - 1) return;
      const dep = (g.plotY + g.H) / 2;
      state.activeIndex = di;
      showCursor(panel, m, state, di);
      showActiveDots(panel, m, state, di);
      positionTooltip(null, g.vertical ? dep : g.cats[di], g.vertical ? g.cats[di] : dep, di);
    };
    if (state.geom) show();
    else state.onFirstRender = show;
  }

  // The keyboard interaction of Recharts' keyboardEventsMiddleware: the
  // first focus activates index 0, the arrow keys walk the categories and
  // stop at the ends, Enter toggles the interaction at the current index
  // and blur deactivates it but keeps the index.
  state.keyboard = { active: false, index: null };

  // spoofKeyboard shows the keyboard tooltip like Recharts spoofs a mouse
  // move: at the tick coordinate and offset.top plus half the height, and
  // only in the horizontal layout.
  const spoofKeyboard = () => {
    const g = state.geom;
    if (!g || !g.cats || g.vertical) return;
    const i = Math.min(Math.max(state.keyboard.index, 0), g.cats.length - 1);
    const rect = panel.getBoundingClientRect();
    const e = { clientX: rect.left + g.cats[i], clientY: rect.top + g.plotY + g.H / 2 };
    state.activeIndex = i;
    showCursor(panel, m, state, i);
    showActiveDots(panel, m, state, i);
    positionTooltip(e, g.cats[i], null, i);
  };

  // combineTooltipInteractionState: an active hover always wins, then the
  // active keyboard interaction, otherwise the tooltip hides. This is why
  // a touch tap stays where the finger is even though the tap also
  // focuses the surface.
  function resolveTooltip() {
    if (state.hoverActive) return;
    if (state.keyboard.active) {
      spoofKeyboard();
      return;
    }
    state.activeIndex = null;
    wrapper.style.visibility = "hidden";
    hideCursor(panel);
  }

  if (m.accessibilityLayer !== false) {
    // focusAction: only the first focus activates the keyboard
    // interaction, at index 0; a refocus after blur keeps the tooltip
    // hidden until the arrow keys move it again.
    panel.addEventListener("focusin", () => {
      if (state.keyboard.active) return;
      if (state.keyboard.index == null) {
        state.keyboard = { active: true, index: 0 };
        resolveTooltip();
      }
    });
    // blurAction deactivates the interaction but keeps the index.
    panel.addEventListener("focusout", () => {
      if (state.keyboard.active) {
        state.keyboard.active = false;
        resolveTooltip();
      }
    });
    panel.addEventListener("keydown", (e) => {
      const g = state.geom;
      if (!g || !g.cats || g.vertical) return;
      if (e.key === "Enter") {
        if (state.keyboard.index == null) return;
        state.keyboard.active = !state.keyboard.active;
        resolveTooltip();
        return;
      }
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      const movement = e.key === "ArrowRight" ? 1 : -1;
      const next = state.keyboard.index == null ? (movement > 0 ? 0 : g.cats.length - 1) : state.keyboard.index + movement;
      if (next < 0 || next > g.cats.length - 1) return;
      state.keyboard = { active: true, index: next };
      resolveTooltip();
    });
  }
}

function init() {
  document.querySelectorAll("script[data-tui-chart-model]").forEach(initPanel);
}

/* Interactive demo wiring: selects and header buttons toggle the SSR
 * rendered variants of a chart. */
document.addEventListener("select-change", (e) => {
  const trigger = e.target instanceof Element && e.target.closest("[data-tui-chart-range-select], [data-tui-chart-month-select]");
  if (!trigger) return;
  const value = e.detail && e.detail.value;
  if (!value) return;
  const chart = trigger.closest("[data-slot=card]");
  if (!chart) return;
  const attr = trigger.hasAttribute("data-tui-chart-range-select") ? "data-tui-chart-range" : "data-tui-chart-month";
  chart.querySelectorAll(`[${attr}]`).forEach((el) => {
    el.hidden = el.getAttribute(attr) !== value;
  });
});

document.addEventListener("click", (e) => {
  if (!(e.target instanceof Element)) return;
  const btn = e.target.closest("[data-tui-chart-series]");
  if (!btn) return;
  const chart = btn.closest("[data-slot=card]");
  if (!chart) return;
  const series = btn.getAttribute("data-tui-chart-series");
  chart.querySelectorAll("[data-tui-chart-series]").forEach((b) => {
    b.setAttribute("data-active", b === btn ? "true" : "false");
  });
  chart.querySelectorAll("[data-tui-chart-series-panel]").forEach((el) => {
    el.hidden = el.getAttribute("data-tui-chart-series-panel") !== series;
  });
});

// Setup on load and on mutations, the shadcn-templ convention: init is
// idempotent (every panel carries its own init flag), so any inserted
// node just re-runs the full scan, no matter what put it into the DOM.
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
// Re-init on any childList mutation, directly (never rAF-deferred: rAF
// does not fire in hidden tabs or throttled iframes): swapped-in markup
// wires itself.
new MutationObserver(() => init()).observe(document.body, { childList: true, subtree: true });

// components/checkbox/checkbox.js
(function () {
  "use strict";

  // Vanilla port of Base UI's checkbox: the root span behavior comes from
  // checkbox/root/CheckboxRoot.tsx, the non-native button keyboard semantics
  // from internals/use-button/useButton.ts. Clicks and Space forward to the
  // visually hidden native input beside the root; the input's change event
  // syncs the state attributes back onto the root and indicator.

  function inputOf(root) {
    const next = root.nextElementSibling;
    return next && next.matches("[data-tui-checkbox-input]") ? next : null;
  }

  function rootOf(input) {
    const prev = input.previousElementSibling;
    return prev && prev.matches("[data-tui-checkbox]") ? prev : null;
  }

  function isDisabled(root, input) {
    return (input && input.disabled) || root.getAttribute("aria-disabled") === "true";
  }

  function isReadOnly(root) {
    return root.getAttribute("aria-readonly") === "true";
  }

  // Port of utils/dispatchClickWithModifiers.ts: the constructed click keeps
  // the source event's modifier state and still runs native activation
  // behavior (toggling the input).
  function forwardClick(target, sourceEvent) {
    target.dispatchEvent(
      new PointerEvent("click", {
        bubbles: true,
        cancelable: true,
        composed: true,
        detail: 0,
        shiftKey: sourceEvent.shiftKey,
        ctrlKey: sourceEvent.ctrlKey,
        altKey: sourceEvent.altKey,
        metaKey: sourceEvent.metaKey,
      }),
    );
  }

  function sync(root, input) {
    const checked = input.checked;
    // The input's indeterminate IDL property is the source of truth for the
    // mixed state (Base UI's indeterminate prop): a user click clears it
    // natively, scripts set it and dispatch change.
    const indeterminate = input.indeterminate;
    root.setAttribute("aria-checked", indeterminate ? "mixed" : String(checked));
    root.toggleAttribute("data-indeterminate", indeterminate);
    root.toggleAttribute("data-checked", checked);
    root.toggleAttribute("data-unchecked", !checked);
    const indicator = root.querySelector('[data-slot="checkbox-indicator"]');
    if (indicator) {
      // Base UI unmounts the indicator while unchecked; we toggle [hidden].
      indicator.hidden = !checked && !indeterminate;
      indicator.toggleAttribute("data-indeterminate", indeterminate);
      indicator.toggleAttribute("data-checked", checked);
      indicator.toggleAttribute("data-unchecked", !checked);
    }
  }

  function requestCheckedChange(root, input, sourceEvent) {
    const nextChecked = !input.checked;
    const change = new CustomEvent("checkbox-change", {
      bubbles: true,
      cancelable: true,
      detail: { checked: nextChecked },
    });
    root.dispatchEvent(change);
    if (change.defaultPrevented || root.hasAttribute("data-tui-checkbox-controlled")) return;
    forwardClick(input, sourceEvent);
  }

  // CheckboxRoot onClick: cancel the click's default (a wrapping label would
  // otherwise forward it to the input a second time) and toggle through the
  // hidden input so the native change event fires.
  document.addEventListener("click", (e) => {
    const root = e.target.closest && e.target.closest("[data-tui-checkbox]");
    if (!root) return;
    const input = inputOf(root);
    if (!input) return;
    if (isDisabled(root, input)) {
      // useButton prevents clicks on disabled non-native buttons.
      e.preventDefault();
      return;
    }
    if (isReadOnly(root)) return;
    e.preventDefault();
    requestCheckedChange(root, input, e);
  });

  document.addEventListener("change", (e) => {
    const input = e.target;
    if (!input.matches || !input.matches("[data-tui-checkbox-input]")) return;
    const root = rootOf(input);
    if (root) sync(root, input);
  });

  document.addEventListener("keydown", (e) => {
    const root = e.target;
    if (!root.matches || !root.matches("[data-tui-checkbox]")) return;
    const input = inputOf(root);
    if (isDisabled(root, input)) return;
    if (e.key === "Enter") {
      // CheckboxRoot onKeyDown: Enter never toggles the checkbox, it submits
      // the owning form through its default submitter
      // (@base-ui/utils/getDefaultFormSubmitter.ts).
      if (e.defaultPrevented) return;
      e.preventDefault();
      const form = input && input.form;
      if (!form) return;
      for (const candidate of form.elements) {
        const tagName = candidate.tagName;
        if ((tagName === "BUTTON" || tagName === "INPUT") && candidate.type === "submit") {
          candidate.click();
          return;
        }
      }
    } else if (e.key === " ") {
      // useButton: Space activates on keyup; prevent the page scroll.
      e.preventDefault();
    }
  });

  // useButton keyup: Space dispatches the click on the root itself, which the
  // click handler above forwards to the input.
  document.addEventListener("keyup", (e) => {
    const root = e.target;
    if (!root.matches || !root.matches("[data-tui-checkbox]")) return;
    if (e.key !== " " || e.defaultPrevented) return;
    if (isDisabled(root, inputOf(root))) return;
    forwardClick(root, e);
  });

  // Focus on the hidden input (label clicks, programmatic focus) belongs on
  // the root (CheckboxRoot's input onFocus).
  document.addEventListener("focusin", (e) => {
    const input = e.target;
    if (!input.matches || !input.matches("[data-tui-checkbox-input]")) return;
    const root = rootOf(input);
    if (root) root.focus();
  });

  let labelId = 0;

  function setup(root) {
    if (root.hasAttribute("data-tui-checkbox-initialized")) return;
    root.setAttribute("data-tui-checkbox-initialized", "");
    const input = inputOf(root);
    if (!input) return;
    // SSR'd mixed state: the input element has no indeterminate attribute,
    // so the root's data-indeterminate seeds the IDL property.
    if (root.hasAttribute("data-indeterminate")) {
      input.indeterminate = true;
    }
    // The clicks dispatched on the hidden input are an implementation detail
    // and must not reach ancestors, which already receive the original click
    // (CheckboxRoot's input onClick).
    input.addEventListener("click", (e) => e.stopPropagation());
    // useAriaLabelledBy fallback: the span control is labelled by the native
    // label associated with the hidden input.
    if (!root.hasAttribute("aria-labelledby") && !root.hasAttribute("aria-label")) {
      const label =
        input.parentElement && input.parentElement.tagName === "LABEL"
          ? input.parentElement
          : input.labels && input.labels[0];
      if (label) {
        if (!label.id) {
          labelId += 1;
          label.id = (input.id || "tui-checkbox-" + labelId) + "-label";
        }
        root.setAttribute("aria-labelledby", label.id);
      }
    }
    sync(root, input);
  }

  function init() {
    document.querySelectorAll("[data-tui-checkbox]").forEach(setup);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
  new MutationObserver(() => init()).observe(document.body, { childList: true, subtree: true });
})();

// components/collapsible/collapsible.js
(function () {
  "use strict";

  function panelFor(trigger) {
    return document.getElementById(trigger.getAttribute("aria-controls") || "");
  }

  function setOpen(el, isOpen) {
    el.toggleAttribute("data-open", isOpen);
    el.toggleAttribute("data-closed", !isOpen);
  }

  // Exposes the measured panel height, like Base UI's
  // --collapsible-panel-height, so consumers can animate it.
  function measure(panel) {
    panel.style.setProperty("--collapsible-panel-height", panel.scrollHeight + "px");
    panel.style.setProperty("--collapsible-panel-width", panel.scrollWidth + "px");
  }

  function finishClose(panel) {
    if (!panel.hasAttribute("data-ending-style")) return;
    panel.hidden = true;
    panel.removeAttribute("data-ending-style");
  }

  function timeMs(value) {
    value = value.trim();
    if (value.endsWith("ms")) return parseFloat(value) || 0;
    if (value.endsWith("s")) return (parseFloat(value) || 0) * 1000;
    return 0;
  }

  function motionMs(panel) {
    const style = getComputedStyle(panel);
    const totals = (durations, delays) => {
      const ds = durations.split(",");
      const ls = delays.split(",");
      return ds.map((duration, i) => timeMs(duration) + timeMs(ls[i % ls.length] || "0s"));
    };
    return Math.max(
      0,
      ...totals(style.transitionDuration, style.transitionDelay),
      ...totals(style.animationDuration, style.animationDelay),
    );
  }

  function toggle(trigger) {
    const panel = panelFor(trigger);
    if (!panel) return;
    const root = panel.closest("[data-tui-collapsible]");
    if (!root || root.hasAttribute("data-disabled")) return;
    const isOpen = !panel.hasAttribute("data-open");
  const accepted = root.dispatchEvent(
    new CustomEvent("collapsible-open-change", {
      bubbles: true,
      cancelable: true,
      detail: { open: isOpen },
    }),
  );
  if (!accepted || root.hasAttribute("data-tui-collapsible-controlled")) return;

    setOpen(root, isOpen);
    trigger.setAttribute("aria-expanded", isOpen ? "true" : "false");
    trigger.toggleAttribute("data-panel-open", isOpen);
    if (isOpen) {
      clearTimeout(panel._tuiCloseTimer);
      panel.hidden = false;
      panel.removeAttribute("data-ending-style");
      setOpen(panel, true);
      measure(panel);
      panel.setAttribute("data-starting-style", "");
      requestAnimationFrame(() => {
        requestAnimationFrame(() => panel.removeAttribute("data-starting-style"));
      });
    } else {
      panel.removeAttribute("data-starting-style");
      setOpen(panel, false);
      panel.setAttribute("data-ending-style", "");
      clearTimeout(panel._tuiCloseTimer);
      const duration = motionMs(panel);
      if (duration === 0) {
        finishClose(panel);
      } else {
        panel._tuiCloseTimer = setTimeout(() => finishClose(panel), duration + 50);
      }
    }
  }

  document.addEventListener("click", (e) => {
    if (!(e.target instanceof Element)) return;
    const trigger = e.target.closest("[data-tui-collapsible-trigger]");
    if (trigger) toggle(trigger);
  });

  function finishMotion(e) {
    if (!(e.target instanceof Element)) return;
    const panel = e.target.closest("[data-tui-collapsible-content][data-ending-style]");
    if (panel) finishClose(panel);
  }

  document.addEventListener("transitionend", finishMotion);
  document.addEventListener("animationend", finishMotion);

  document.querySelectorAll("[data-tui-collapsible-content][data-open]").forEach(measure);
})();

// components/combobox/combobox.js
// Uses window.FloatingUIDOM from components/floatingui (loaded in the same bundle).
(function () {
  // Constants from Base UI's combobox, shadcn's reference implementation.
  const EXIT_MS = 120; // exit animation (duration-100) + slack
  const SIDE_OFFSET = 6;
  const COLLISION_PADDING = 5;

  const escapeTargets = new WeakSet();
  function listenForEscape(element) {
    if (!element || escapeTargets.has(element)) return;
    element.addEventListener("keydown", closeOnEscapeKeyDown);
    escapeTargets.add(element);
  }

  // useDismiss: popup/reference listeners stop Escape before outer document handlers.
  function closeOnEscapeKeyDown(event) {
    if (event.key !== "Escape") return;
    const contents = event.currentTarget === document
      ? allContents()
      : [event.currentTarget.hasAttribute("data-tui-combobox-content")
        ? event.currentTarget
        : contentFor(event.currentTarget)];
    let handled = false;
    for (const content of contents) {
      if (!content?.hasAttribute("data-open")) continue;
      if (requestOpenChange(content, false)) event.preventDefault();
      event.stopPropagation();
      handled = true;
    }
    return handled;
  }

  function allContents() {
    return document.querySelectorAll("[data-tui-combobox-content]");
  }

  // The anchor is the input group, chips container or button trigger OUTSIDE
  // the content (an input group inside the popup also carries the attribute
  // but never anchors the position).
  function anchorFor(content) {
    return [...document.querySelectorAll('[data-tui-combobox-anchor="' + content.id + '"]')].find(
      (a) => !content.contains(a),
    );
  }

  function contentFor(el) {
    const anchor = el.closest("[data-tui-combobox-anchor]");
    return anchor ? document.getElementById(anchor.getAttribute("data-tui-combobox-anchor")) : null;
  }

  // What the popup is positioned against, like shadcn's runtime: the chips
  // container or a button trigger anchor as a whole, but for an input group
  // the INPUT CONTROL itself (Base UI's inputElement default) — that is why
  // shadcn's min-w adds --spacing(7) and the input-group example uses
  // alignOffset -28.
  function positionAnchorFor(content) {
    const anchor = anchorFor(content);
    if (!anchor) return null;
    if (
      anchor.hasAttribute("data-tui-combobox-chips") ||
      anchor.hasAttribute("data-tui-combobox-trigger")
    ) {
      return anchor;
    }
    return anchor.querySelector("[data-tui-combobox-input]") || anchor;
  }

  // The filter input sits in the anchor, or inside the popup (button-trigger
  // pattern).
  function inputFor(content) {
    const anchor = anchorFor(content);
    return (
      (anchor && anchor.querySelector("[data-tui-combobox-input]")) ||
      content.querySelector("[data-tui-combobox-input]")
    );
  }

  function valueDisplayFor(content) {
    const anchor = anchorFor(content);
    return anchor ? anchor.querySelector("[data-tui-combobox-value-display]") : null;
  }

  function setExpanded(content, expanded) {
    const input = inputFor(content);
    if (input) input.setAttribute("aria-expanded", expanded ? "true" : "false");
    const anchor = anchorFor(content);
    if (anchor && anchor.hasAttribute("data-tui-combobox-trigger")) {
      anchor.setAttribute("aria-expanded", expanded ? "true" : "false");
    }
  }

  function popupFor(content) {
    return content.querySelector("[data-tui-combobox-popup]");
  }

  function listFor(content) {
    return content.querySelector("[data-tui-combobox-list]");
  }

  function itemsOf(content) {
    return [...content.querySelectorAll("[data-tui-combobox-item]")];
  }

  function labelOf(item) {
    return item.getAttribute("data-tui-combobox-label") || item.textContent.trim();
  }

  function isMultiple(content) {
    const popup = popupFor(content);
    // data-chips is always rendered as "true"/"false" (React stringifies
    // data-* booleans the same way), so the value decides, not presence.
    return popup && popup.getAttribute("data-chips") === "true";
  }

  function selectedItems(content) {
    return itemsOf(content).filter((i) => i.hasAttribute("data-selected"));
  }

  function setState(content, state) {
    const open = state === "open";
    content.toggleAttribute("data-open", open);
    content.toggleAttribute("data-closed", !open);
    const popup = popupFor(content);
    if (popup) {
      popup.toggleAttribute("data-open", open);
      popup.toggleAttribute("data-closed", !open);
    }
  }

  function setSide(content, side) {
    content.setAttribute("data-side", side);
    const popup = popupFor(content);
    if (popup) popup.setAttribute("data-side", side);
  }

  function sideOffsetOf(content) {
    const v = parseFloat(content.getAttribute("data-tui-combobox-side-offset"));
    return isNaN(v) ? SIDE_OFFSET : v;
  }

  // Base UI zooms the popup out of the anchor's center point (e.g.
  // "128px -4px"), not out of a placement corner.
  function anchorOrigin(result, anchorRect, positionerRect, sideOffset) {
    const side = result.placement.split("-")[0];
    const centerX = anchorRect.left + anchorRect.width / 2 - positionerRect.left + "px";
    const centerY = anchorRect.top + anchorRect.height / 2 - positionerRect.top + "px";
    if (side === "bottom") return centerX + " " + -sideOffset + "px";
    if (side === "top") return centerX + " calc(100% + " + sideOffset + "px)";
    if (side === "right") return -sideOffset + "px " + centerY;
    return "calc(100% + " + sideOffset + "px) " + centerY;
  }

  // Moves the content to <body> (shadcn portals it the same way).
  // The unmount half of the React portal pendant: a portaled content lives
  // as long as its SSR declaration site (_tuiPortalOwner) stays in the
  // document. Trigger-presence heuristics judged mid-swap moments wrongly -
  // multi-phase swap layers briefly disconnect the new triggers.
  function removeOrphanedContents(content) {
    document.querySelectorAll("body > [data-tui-combobox-content]").forEach((c) => {
      if (c !== content && c._tuiPortalOwner && !c._tuiPortalOwner.isConnected) {
        stopAutoPositioning(c);
        c.remove();
      }
    });
  }

  function portal(content) {
    listenForEscape(content);
    removeOrphanedContents(content);
    if (content.parentElement !== document.body) {
      if (!content._tuiPortalOwner) content._tuiPortalOwner = content.parentElement;
      document.body.appendChild(content);
    }
  }

  function position(content) {
    const anchor = positionAnchorFor(content);
    if (!anchor) return Promise.resolve();
    const { computePosition, offset, flip, shift, size } = window.FloatingUIDOM;
    const side = content.getAttribute("data-tui-combobox-side") || "bottom";
    const align = content.getAttribute("data-tui-combobox-align") || "start";
    const alignOffset = parseFloat(content.getAttribute("data-tui-combobox-align-offset")) || 0;
    const sideOffset = sideOffsetOf(content);
    const placement = align === "center" ? side : side + "-" + align;

    return computePosition(anchor, content, {
      placement: placement,
      strategy: "absolute",
      middleware: [
        offset({ mainAxis: sideOffset, crossAxis: alignOffset }),
        flip({ padding: COLLISION_PADDING }),
        shift({ padding: COLLISION_PADDING }),
        size({
          padding: COLLISION_PADDING,
          apply(args) {
            content.style.setProperty("--tui-combobox-available-height", args.availableHeight + "px");
            content.style.setProperty("--tui-combobox-available-width", args.availableWidth + "px");
            content.style.setProperty("--tui-combobox-anchor-width", args.rects.reference.width + "px");
          },
        }),
      ],
    }).then((result) => {
      content.style.left = result.x + "px";
      content.style.top = result.y + "px";
      setSide(content, result.placement.split("-")[0]);
      const popup = popupFor(content);
      if (popup) {
        popup.style.setProperty(
          "--tui-combobox-transform-origin",
          anchorOrigin(
            result,
            anchor.getBoundingClientRect(),
            content.getBoundingClientRect(),
            sideOffset,
          ),
        );
      }
    });
  }

  function startAutoPositioning(content) {
    const anchor = positionAnchorFor(content);
    if (!anchor) return Promise.resolve();
    if (content._tuiPositionCleanup) content._tuiPositionCleanup();
    let resolveFirst;
    const firstPosition = new Promise((resolve) => {
      resolveFirst = resolve;
    });
    const update = () => position(content).then(resolveFirst, resolveFirst);
    content._tuiPositionCleanup = window.FloatingUIDOM.autoUpdate(anchor, content, update, {
      elementResize: typeof ResizeObserver !== "undefined",
      layoutShift: typeof IntersectionObserver !== "undefined",
    });
    return firstPosition;
  }

  function stopAutoPositioning(content) {
    if (!content._tuiPositionCleanup) return;
    content._tuiPositionCleanup();
    content._tuiPositionCleanup = null;
  }

  // ----- filtering ----------------------------------------------------------

  function applyFilter(content, query) {
    const q = query.trim().toLowerCase();
    let visible = 0;
    itemsOf(content).forEach((item) => {
      const match = q === "" || labelOf(item).toLowerCase().includes(q);
      item.hidden = !match;
      if (match) visible += 1;
    });
    content.querySelectorAll("[data-tui-combobox-group]").forEach((group) => {
      group.hidden = !group.querySelector("[data-tui-combobox-item]:not([hidden])");
    });
    const popup = popupFor(content);
    const list = listFor(content);
    popup.toggleAttribute("data-empty", visible === 0);
    if (list) list.toggleAttribute("data-empty", visible === 0);

    const highlighted = highlightedItem(content);
    if (highlighted && highlighted.hidden) setHighlight(content, null);
    if (!highlightedItem(content) && content.hasAttribute("data-tui-combobox-auto-highlight")) {
      setHighlight(content, visibleItems(content)[0] || null);
    }
  }

  function visibleItems(content) {
    return itemsOf(content).filter((i) => !i.hidden && !i.hasAttribute("data-disabled"));
  }

  // ----- highlight ----------------------------------------------------------

  function highlightedItem(content) {
    return content.querySelector("[data-tui-combobox-item][data-highlighted]");
  }

  function setHighlight(content, item) {
    itemsOf(content).forEach((i) => {
      if (i !== item) i.removeAttribute("data-highlighted");
    });
    if (item) {
      item.setAttribute("data-highlighted", "");
      item.scrollIntoView({ block: "nearest" });
    }
    // Focus stays on the input while the highlight moves, so
    // aria-activedescendant is the only thing naming the current option.
    const input = inputFor(content);
    if (!input) return;
    if (item && item.id) {
      input.setAttribute("aria-activedescendant", item.id);
    } else {
      input.removeAttribute("aria-activedescendant");
    }
  }

  function moveHighlight(content, dir) {
    const items = visibleItems(content);
    if (!items.length) return;
    const current = highlightedItem(content);
    let index = items.indexOf(current);
    index = index === -1 ? (dir > 0 ? 0 : items.length - 1) : index + dir;
    index = Math.max(0, Math.min(items.length - 1, index));
    setHighlight(content, items[index]);
  }

  // ----- open / close -------------------------------------------------------

  function open(content) {
    if (content.hasAttribute("data-open")) return;
    allContents().forEach((c) => {
      if (c !== content) requestOpenChange(c, false);
    });
    clearTimeout(content._tuiHide);
    portal(content);
    // z-index portal like shadcn (no native top layer); re-append
    // keeps paint order = open order.
    document.body.appendChild(content);
    content.hidden = false;

    applyFilter(content, "");
    // Base UI highlights the current selection on open, else (with
    // autoHighlight) the first item.
    const selected = selectedItems(content).find((i) => !i.hidden);
    setHighlight(content, selected || null);
    if (!selected && content.hasAttribute("data-tui-combobox-auto-highlight")) {
      setHighlight(content, visibleItems(content)[0] || null);
    }

    // Position it invisibly first, then play the enter animation in place.
    content.style.visibility = "hidden";
    const finish = () => {
      // duration-100 transitions `all`; a visibility transition would
      // freeze at hidden in background tabs - flip suppressed.
      content.style.transitionProperty = "none";
      content.style.visibility = "";
      void content.offsetWidth;
      content.style.transitionProperty = "";
      if (content.hidden) return;
      setState(content, "open");
      setExpanded(content, true);
    };
    startAutoPositioning(content).then(finish, finish);
  }

  function close(content) {
    if (content.hidden) return;
    stopAutoPositioning(content);
    content.style.visibility = "";
    setState(content, "closed");
    setExpanded(content, false);
    const input = inputFor(content);
    if (input) {
      // Revert the typed text: an in-popup input is a pure search box, an
      // anchor input shows the selected label.
      input.value =
        isMultiple(content) || content.contains(input) ? "" : displayValue(content);
    }
    clearTimeout(content._tuiHide);
    content._tuiHide = setTimeout(() => {
      if (content.hasAttribute("data-closed") && !content.hidden) {
        content.hidden = true;
      }
    }, EXIT_MS);
  }

  function closeAll() {
  allContents().forEach((content) => requestOpenChange(content, false));
  }

  function requestOpenChange(content, nextOpen) {
  const anchor = anchorFor(content);
  const change = new CustomEvent("combobox-open-change", {
    bubbles: true,
    cancelable: true,
    detail: { open: nextOpen },
  });
  const accepted = (anchor || content).dispatchEvent(change);
  if (!accepted || content.hasAttribute("data-tui-combobox-open-controlled")) return false;
  if (nextOpen) open(content);
  else close(content);
  return true;
  }

  function displayValue(content) {
    const selected = selectedItems(content)[0];
    return selected ? labelOf(selected) : "";
  }

  // ----- selection ----------------------------------------------------------

  function hiddenInputs(anchor) {
    return [...anchor.querySelectorAll("[data-tui-combobox-hidden]")];
  }

  function dispatchNativeChange(anchor) {
    const first = hiddenInputs(anchor)[0];
    if (first) first.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function requestValueChange(content, values) {
  const controlled = content.hasAttribute("data-tui-combobox-value-controlled");
  const anchor = anchorFor(content);
  if (!anchor || content.hasAttribute("data-tui-combobox-readonly")) {
    return { accepted: false, controlled };
  }
  const change = new CustomEvent("combobox-change", {
    bubbles: true,
    cancelable: true,
    detail: { values },
  });
  const accepted = anchor.dispatchEvent(change);
  return { accepted, controlled };
  }

  function syncHiddenInputs(content, anchor) {
    const inputs = hiddenInputs(anchor);
    if (!inputs.length) return;
    const name = inputs[0].name;
    if (isMultiple(content)) {
      inputs.slice(1).forEach((i) => i.remove());
      const values = selectedItems(content).map((i) => i.getAttribute("data-tui-combobox-value") || "");
      const first = inputs[0];
      first.value = values[0] || "";
      values.slice(1).forEach((v) => {
        const clone = first.cloneNode();
        clone.value = v;
        first.parentElement.insertBefore(clone, first.nextSibling);
      });
    } else {
      const selected = selectedItems(content)[0];
      inputs[0].value = selected ? selected.getAttribute("data-tui-combobox-value") || "" : "";
    }
    inputs[0].name = name;
  }

  function syncChips(content, anchor) {
    if (!anchor.hasAttribute("data-tui-combobox-chips")) return;
    const template = anchor.querySelector("[data-tui-combobox-chip-template]");
    anchor.querySelectorAll("[data-tui-combobox-chip]").forEach((chip) => {
      if (!chip.closest("[data-tui-combobox-chip-template]")) chip.remove();
    });
    if (!template) return;
    const input = anchor.querySelector("[data-tui-combobox-input]");
    selectedItems(content).forEach((item) => {
      const chip = template.content.firstElementChild.cloneNode(true);
      chip.setAttribute("data-tui-combobox-value", item.getAttribute("data-tui-combobox-value") || "");
      chip.querySelector("[data-tui-combobox-chip-label]").textContent = labelOf(item);
      anchor.insertBefore(chip, input);
    });
  }

  function toggleClear(content, anchor) {
    const clear = anchor.querySelector("[data-tui-combobox-clear]");
    if (clear) clear.hidden = selectedItems(content).length === 0;
  }

  function syncValueDisplay(content) {
    const display = valueDisplayFor(content);
    if (!display) return;
    const label = displayValue(content);
    const text = label || display.getAttribute("data-tui-combobox-placeholder") || "";
    if (display.textContent !== text) display.textContent = text;
  }

  function afterSelectionChange(content) {
    const anchor = anchorFor(content);
    if (!anchor) return;
    syncChips(content, anchor);
    syncHiddenInputs(content, anchor);
    toggleClear(content, anchor);
    syncValueDisplay(content);
  dispatchNativeChange(anchor);
  }

  function selectItem(content, item) {
    const input = inputFor(content);
    if (isMultiple(content)) {
    const values = selectedItems(content).map((selected) => selected.getAttribute("data-tui-combobox-value") || "");
    const value = item.getAttribute("data-tui-combobox-value") || "";
    const nextValues = item.hasAttribute("data-selected")
      ? values.filter((selected) => selected !== value)
      : [...values, value];
    const request = requestValueChange(content, nextValues);
    if (!request.accepted || request.controlled) return;
      if (item.hasAttribute("data-selected")) item.removeAttribute("data-selected");
      else item.setAttribute("data-selected", "true");
      item.setAttribute("aria-selected", item.hasAttribute("data-selected") ? "true" : "false");
      afterSelectionChange(content);
      if (input) {
        input.value = "";
        input.focus();
      }
      applyFilter(content, "");
      position(content); // the chips anchor may have grown or shrunk
      return;
    }
  const nextValue = item.getAttribute("data-tui-combobox-value") || "";
  const request = requestValueChange(content, [nextValue]);
  if (!request.accepted) return;
  if (request.controlled) {
    requestOpenChange(content, false);
    return;
  }
    itemsOf(content).forEach((i) => {
      i.removeAttribute("data-selected");
      i.setAttribute("aria-selected", "false");
    });
    item.setAttribute("data-selected", "true");
    item.setAttribute("aria-selected", "true");
    if (input) input.value = labelOf(item);
    afterSelectionChange(content);
  requestOpenChange(content, false);
  }

  function clearSelection(content) {
  const request = requestValueChange(content, []);
  if (!request.accepted || request.controlled) return;
    itemsOf(content).forEach((i) => {
      i.removeAttribute("data-selected");
      i.setAttribute("aria-selected", "false");
    });
    const input = inputFor(content);
    if (input) {
      input.value = "";
      input.focus();
    }
    afterSelectionChange(content);
    applyFilter(content, "");
  }

  // Shows the selected item's label in the input (server only knows the
  // value, the label lives in the item). Runs on load and whenever new
  // comboboxes appear in the DOM; the MutationObserver keeps this
  // framework-agnostic.
  function init() {
    removeOrphanedContents();
    document.querySelectorAll("[data-tui-combobox-input], [data-tui-combobox-trigger]").forEach(listenForEscape);
    allContents().forEach((content) => {
      if (content.getAttribute("data-tui-combobox-initial-open") === "true") {
        content.removeAttribute("data-tui-combobox-initial-open");
        open(content);
      }
      if (isMultiple(content)) return;
      syncValueDisplay(content);
      const input = inputFor(content);
      if (!input || input.value !== "" || content.contains(input)) return;
      const label = displayValue(content);
      if (label) input.value = label;
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
  // Re-init on any childList mutation, directly (never rAF-deferred: rAF
  // does not fire in hidden tabs or throttled iframes): swapped-in markup
  // wires itself, removals release portaled content through the
  // ownership sweep.
  new MutationObserver(() => init()).observe(document.body, { childList: true, subtree: true });

  // ----- events -------------------------------------------------------------

  // Pointer interactions toggle and dismiss on PRESS, exactly like Base UI.
  // Click is never used for open/close, so the stray click the browser fires
  // on <body> when the popup ends up under the released pointer is harmless.
  function toggleTrigger(trigger) {
    const content = contentFor(trigger);
    if (!content) return;
    if (content.hasAttribute("data-open")) {
    requestOpenChange(content, false);
    } else {
      const input = inputFor(content);
      if (input && input.disabled) return;
    requestOpenChange(content, true);
      if (input) requestAnimationFrame(() => input.focus());
    }
  }

  document.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 || !(e.target instanceof Element)) return;

    const trigger = e.target.closest("[data-tui-combobox-trigger]");
    if (trigger) {
      toggleTrigger(trigger);
      return;
    }

    // Clear and chip-remove buttons act on the selection, they never open.
    if (e.target.closest("[data-tui-combobox-clear], [data-tui-combobox-chip-remove]")) return;

    const anchor = e.target.closest("[data-tui-combobox-anchor]");
    if (anchor && !anchor.closest("[data-tui-combobox-content]")) {
      const content = document.getElementById(anchor.getAttribute("data-tui-combobox-anchor"));
      if (!content || content.hasAttribute("data-open")) return;
      const field = inputFor(content);
    if (field && !field.disabled) requestOpenChange(content, true);
      return;
    }

    // Base UI dismisses on outside PRESS, not on the later click.
    if (!e.target.closest("[data-tui-combobox-content]")) closeAll();
  });

  document.addEventListener("click", (e) => {
    if (!(e.target instanceof Element)) return;

    const remove = e.target.closest("[data-tui-combobox-chip-remove]");
    if (remove && !remove.closest("[data-tui-combobox-chip-template]")) {
      const chip = remove.closest("[data-tui-combobox-chip]");
      const content = contentFor(remove);
      if (chip && content) {
        const value = chip.getAttribute("data-tui-combobox-value");
        const item = itemsOf(content).find(
          (i) => (i.getAttribute("data-tui-combobox-value") || "") === value,
        );
    if (item) selectItem(content, item);
      }
      return;
    }

    const clear = e.target.closest("[data-tui-combobox-clear]");
    if (clear) {
      const content = contentFor(clear);
      if (content) clearSelection(content);
      return;
    }

    const trigger = e.target.closest("[data-tui-combobox-trigger]");
    if (trigger) {
      // Keyboard activation only (Enter/Space fire a detail-0 click without
      // a preceding pointerdown); pointer presses are handled on pointerdown.
      if (e.detail === 0) toggleTrigger(trigger);
      return;
    }

    const item = e.target.closest("[data-tui-combobox-item]");
    if (item && !item.hasAttribute("data-disabled")) {
      const content = item.closest("[data-tui-combobox-content]");
      if (content) selectItem(content, item);
    }
  });

  document.addEventListener("input", (e) => {
    if (!(e.target instanceof Element) || !e.target.hasAttribute("data-tui-combobox-input")) return;
    const content = contentFor(e.target);
    if (!content) return;
  if (!content.hasAttribute("data-open")) requestOpenChange(content, true);
    applyFilter(content, e.target.value);
    if (content.hasAttribute("data-open")) position(content);
  });

  document.addEventListener("keydown", (e) => {
    if (closeOnEscapeKeyDown(e)) return;
    if (!(e.target instanceof Element) || !e.target.hasAttribute("data-tui-combobox-input")) return;
    const content = contentFor(e.target);
    if (!content) return;
    const isOpen = content.hasAttribute("data-open");

    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!isOpen) {
    requestOpenChange(content, true);
        return;
      }
      moveHighlight(content, e.key === "ArrowDown" ? 1 : -1);
      return;
    }
    if (e.key === "Enter") {
      const highlighted = isOpen && highlightedItem(content);
      if (highlighted) {
        e.preventDefault();
        selectItem(content, highlighted);
      }
      return;
    }
    if (e.key === "Backspace" && isMultiple(content) && e.target.value === "") {
      const chips = [...e.target.parentElement.querySelectorAll("[data-tui-combobox-chip]")].filter(
        (c) => !c.closest("[data-tui-combobox-chip-template]"),
      );
      const last = chips[chips.length - 1];
      if (last) {
        const btn = last.querySelector("[data-tui-combobox-chip-remove]");
        if (btn) btn.click();
      }
      return;
    }
    if (e.key === "Tab") {
    requestOpenChange(content, false);
    }
  });

  // Hovering an item highlights it, exactly like Base UI.
  document.addEventListener("mousemove", (e) => {
    if (!(e.target instanceof Element)) return;
    const item = e.target.closest("[data-tui-combobox-item]");
    if (!item || item.hasAttribute("data-disabled") || item.hasAttribute("data-highlighted")) return;
    const content = item.closest("[data-tui-combobox-content]");
    if (content && content.hasAttribute("data-open")) setHighlight(content, item);
  });

})();

// components/command/command.js
(function () {
  // 1:1 port of cmdk v1.1.1 (pacocoursey/cmdk), the primitive behind shadcn's
  // base/ui/command.tsx: command-score fuzzy filtering with result sorting,
  // a roving selection, vim bindings and aria-activedescendant wiring.

  const ITEM_SELECTOR = "[data-tui-command-item]";
  const VALID_ITEM_SELECTOR = ITEM_SELECTOR + ':not([aria-disabled="true"]):not([hidden])';
  const GROUP_SELECTOR = "[data-tui-command-group]";
  const GROUP_ITEMS_SELECTOR = "[data-tui-command-group-items]";
  const GROUP_HEADING_SELECTOR = "[cmdk-group-heading]";

  // ----- command-score ------------------------------------------------------
  // 1:1 port of cmdk's command-score.ts (the default filter).

  const SCORE_CONTINUE_MATCH = 1,
    SCORE_SPACE_WORD_JUMP = 0.9,
    SCORE_NON_SPACE_WORD_JUMP = 0.8,
    SCORE_CHARACTER_JUMP = 0.17,
    SCORE_TRANSPOSITION = 0.1,
    PENALTY_SKIPPED = 0.999,
    PENALTY_CASE_MISMATCH = 0.9999,
    PENALTY_NOT_COMPLETE = 0.99;

  const IS_GAP_REGEXP = /[\\\/_+.#"@\[\(\{&]/,
    COUNT_GAPS_REGEXP = /[\\\/_+.#"@\[\(\{&]/g,
    IS_SPACE_REGEXP = /[\s-]/,
    COUNT_SPACE_REGEXP = /[\s-]/g;

  function commandScoreInner(
    string,
    abbreviation,
    lowerString,
    lowerAbbreviation,
    stringIndex,
    abbreviationIndex,
    memoizedResults,
  ) {
    if (abbreviationIndex === abbreviation.length) {
      if (stringIndex === string.length) {
        return SCORE_CONTINUE_MATCH;
      }
      return PENALTY_NOT_COMPLETE;
    }

    const memoizeKey = stringIndex + "," + abbreviationIndex;
    if (memoizedResults[memoizeKey] !== undefined) {
      return memoizedResults[memoizeKey];
    }

    const abbreviationChar = lowerAbbreviation.charAt(abbreviationIndex);
    let index = lowerString.indexOf(abbreviationChar, stringIndex);
    let highScore = 0;

    let score, transposedScore, wordBreaks, spaceBreaks;

    while (index >= 0) {
      score = commandScoreInner(
        string,
        abbreviation,
        lowerString,
        lowerAbbreviation,
        index + 1,
        abbreviationIndex + 1,
        memoizedResults,
      );
      if (score > highScore) {
        if (index === stringIndex) {
          score *= SCORE_CONTINUE_MATCH;
        } else if (IS_GAP_REGEXP.test(string.charAt(index - 1))) {
          score *= SCORE_NON_SPACE_WORD_JUMP;
          wordBreaks = string.slice(stringIndex, index - 1).match(COUNT_GAPS_REGEXP);
          if (wordBreaks && stringIndex > 0) {
            score *= Math.pow(PENALTY_SKIPPED, wordBreaks.length);
          }
        } else if (IS_SPACE_REGEXP.test(string.charAt(index - 1))) {
          score *= SCORE_SPACE_WORD_JUMP;
          spaceBreaks = string.slice(stringIndex, index - 1).match(COUNT_SPACE_REGEXP);
          if (spaceBreaks && stringIndex > 0) {
            score *= Math.pow(PENALTY_SKIPPED, spaceBreaks.length);
          }
        } else {
          score *= SCORE_CHARACTER_JUMP;
          if (stringIndex > 0) {
            score *= Math.pow(PENALTY_SKIPPED, index - stringIndex);
          }
        }

        if (string.charAt(index) !== abbreviation.charAt(abbreviationIndex)) {
          score *= PENALTY_CASE_MISMATCH;
        }
      }

      if (
        (score < SCORE_TRANSPOSITION &&
          lowerString.charAt(index - 1) === lowerAbbreviation.charAt(abbreviationIndex + 1)) ||
        (lowerAbbreviation.charAt(abbreviationIndex + 1) === lowerAbbreviation.charAt(abbreviationIndex) &&
          lowerString.charAt(index - 1) !== lowerAbbreviation.charAt(abbreviationIndex))
      ) {
        transposedScore = commandScoreInner(
          string,
          abbreviation,
          lowerString,
          lowerAbbreviation,
          index + 1,
          abbreviationIndex + 2,
          memoizedResults,
        );

        if (transposedScore * SCORE_TRANSPOSITION > score) {
          score = transposedScore * SCORE_TRANSPOSITION;
        }
      }

      if (score > highScore) {
        highScore = score;
      }

      index = lowerString.indexOf(abbreviationChar, index + 1);
    }

    memoizedResults[memoizeKey] = highScore;
    return highScore;
  }

  function formatInput(string) {
    return string.toLowerCase().replace(COUNT_SPACE_REGEXP, " ");
  }

  function commandScore(string, abbreviation) {
    return commandScoreInner(string, abbreviation, formatInput(string), formatInput(abbreviation), 0, 0, {});
  }

  // ----- helpers ------------------------------------------------------------

  function rootFor(el) {
    return el.closest("[data-tui-command]");
  }

  function inputOf(root) {
    return root.querySelector("[data-tui-command-input]");
  }

  function listOf(root) {
    return root.querySelector("[data-tui-command-list]");
  }

  function sizerOf(root) {
    return root.querySelector("[data-tui-command-list-sizer]");
  }

  function searchOf(root) {
    return root._tuiCommandSearch || "";
  }

  function valueOf(item) {
    return item.getAttribute("data-value") || "";
  }

  function getValidItems(root) {
    return [...root.querySelectorAll(VALID_ITEM_SELECTOR)];
  }

  function getSelectedItem(root) {
    return root.querySelector(ITEM_SELECTOR + '[aria-selected="true"]');
  }

  function score(root, value) {
    return value ? commandScore(value, searchOf(root)) : 0;
  }

  function findNextSibling(el, selector) {
    let sibling = el.nextElementSibling;
    while (sibling) {
      if (sibling.matches(selector)) return sibling;
      sibling = sibling.nextElementSibling;
    }
  }

  function findPreviousSibling(el, selector) {
    let sibling = el.previousElementSibling;
    while (sibling) {
      if (sibling.matches(selector)) return sibling;
      sibling = sibling.previousElementSibling;
    }
  }

  // ----- selection ----------------------------------------------------------

  function scrollSelectedIntoView(root) {
    const item = getSelectedItem(root);
    if (!item) return;
    if (item.parentElement?.firstElementChild === item) {
      // First item in a group: ensure the heading is in view.
      item.closest(GROUP_SELECTOR)?.querySelector(GROUP_HEADING_SELECTOR)?.scrollIntoView({ block: "nearest" });
    }
    item.scrollIntoView({ block: "nearest" });
  }

  // opts.scroll false mirrors cmdk's pointer selection, which skips the
  // scroll-into-view that keyboard selection performs.
  function setSelected(root, item, opts) {
    root.querySelectorAll(ITEM_SELECTOR).forEach((i) => {
      const selected = i === item;
      i.setAttribute("data-selected", selected ? "true" : "false");
      i.setAttribute("aria-selected", selected ? "true" : "false");
    });

    // cmdk re-focuses the input so accessibility works when focus sits on
    // the root or the input itself.
    const input = inputOf(root);
    if (document.activeElement === root || document.activeElement === input) {
      if (input) input.focus();
      else listOf(root)?.focus();
    }

    const id = item ? item.id : null;
    [input, listOf(root)].forEach((el) => {
      if (!el) return;
      if (id) el.setAttribute("aria-activedescendant", id);
      else el.removeAttribute("aria-activedescendant");
    });

    if (item && !(opts && opts.scroll === false)) scrollSelectedIntoView(root);
  }

  function selectFirstItem(root) {
    setSelected(root, getValidItems(root)[0] || null);
  }

  function updateSelectedToIndex(root, index) {
    const item = getValidItems(root)[index];
    if (item) setSelected(root, item);
  }

  // Roving selection without wrapping: cmdk only loops with the loop prop,
  // which shadcn's command.tsx does not set.
  function updateSelectedByItem(root, change) {
    const selected = getSelectedItem(root);
    const items = getValidItems(root);
    const index = items.indexOf(selected);
    const newSelected = items[index + change];
    if (newSelected) setSelected(root, newSelected);
  }

  function updateSelectedByGroup(root, change) {
    const selected = getSelectedItem(root);
    let group = selected?.closest(GROUP_SELECTOR);
    let item;

    while (group && !item) {
      group = change > 0 ? findNextSibling(group, GROUP_SELECTOR) : findPreviousSibling(group, GROUP_SELECTOR);
      item = group?.querySelector(VALID_ITEM_SELECTOR);
    }

    if (item) {
      setSelected(root, item);
    } else {
      updateSelectedByItem(root, change);
    }
  }

  // Activation = cmdk's SELECT_EVENT on Enter or click: the item stays
  // selected and a bubbling command-select event carries its value.
  function activateItem(root, item) {
    setSelected(root, item, { scroll: false });
    item.dispatchEvent(
      new CustomEvent("command-select", { bubbles: true, detail: { value: valueOf(item) } }),
    );
  }

  // ----- filtering ----------------------------------------------------------

  function filterItems(root) {
    const search = searchOf(root);
    const scores = (root._tuiCommandScores = new Map());
    const items = [...root.querySelectorAll(ITEM_SELECTOR)];
    let count = items.length;

    if (search) {
      count = 0;
      items.forEach((item) => {
        const rank = score(root, valueOf(item));
        scores.set(item, rank);
        item.hidden = !(rank > 0);
        if (rank > 0) count++;
      });
    } else {
      items.forEach((item) => {
        item.hidden = false;
      });
    }

    // A group is shown while at least one of its items is.
    root.querySelectorAll(GROUP_SELECTOR).forEach((group) => {
      group.hidden = !group.querySelector(ITEM_SELECTOR + ":not([hidden])");
    });

    // cmdk renders separators only while the search is empty.
    root.querySelectorAll("[data-tui-command-separator]").forEach((sep) => {
      sep.hidden = !!search && !sep.hasAttribute("data-tui-command-always-render");
    });

    // Empty renders only at zero results.
    root.querySelectorAll("[data-tui-command-empty]").forEach((empty) => {
      empty.hidden = count !== 0;
    });
  }

  /** Sorts items by score, and groups by their highest item score (cmdk sort()). */
  function sort(root) {
    const sizer = sizerOf(root);
    if (!sizer) return;

    if (!searchOf(root)) {
      // cmdk unmounts filtered items and remounts them in source order once
      // the search clears; restoring the recorded order is our equivalent.
      [sizer, ...root.querySelectorAll(GROUP_ITEMS_SELECTOR)].forEach((container) => {
        (container._tuiCommandOrder || []).forEach((child) => container.appendChild(child));
      });
      return;
    }

    const scores = root._tuiCommandScores || new Map();

    // Sort the items within their group (or the list) by score.
    getValidItems(root)
      .sort((a, b) => (scores.get(b) ?? 0) - (scores.get(a) ?? 0))
      .forEach((item) => {
        const group = item.closest(GROUP_ITEMS_SELECTOR);
        if (group) {
          group.appendChild(item.parentElement === group ? item : item.closest(GROUP_ITEMS_SELECTOR + " > *"));
        } else {
          sizer.appendChild(item.parentElement === sizer ? item : item.closest("[data-tui-command-list-sizer] > *"));
        }
      });

    // Sort the groups by the maximum score of their items.
    [...root.querySelectorAll(GROUP_SELECTOR)]
      .filter((group) => !group.hidden)
      .map((group) => {
        let max = 0;
        group.querySelectorAll(ITEM_SELECTOR).forEach((item) => {
          max = Math.max(scores.get(item) ?? 0, max);
        });
        return [group, max];
      })
      .sort((a, b) => b[1] - a[1])
      .forEach(([group]) => {
        group.parentElement.appendChild(group);
      });
  }

  function onSearchChange(root, search) {
    root._tuiCommandSearch = search;
    // cmdk: filter synchronously, sort, then select the first item.
    filterItems(root);
    sort(root);
    selectFirstItem(root);
  }

  // ----- setup ---------------------------------------------------------------

  function setup(root) {
    if (root._tuiCommandInit) return;
    root._tuiCommandInit = true;
    root._tuiCommandSearch = "";

    // cmdk infers a missing value from the rendered textContent, and every
    // item needs an id for aria-activedescendant.
    let n = 0;
    root.querySelectorAll(ITEM_SELECTOR).forEach((item) => {
      n++;
      if (!item.id) item.id = root.id + "-item-" + n;
      if (!item.hasAttribute("data-value")) {
        item.setAttribute("data-value", (item.textContent || "").trim());
      }
    });

    // Record source order so clearing the search can undo result sorting.
    const sizer = sizerOf(root);
    [sizer, ...root.querySelectorAll(GROUP_ITEMS_SELECTOR)].forEach((container) => {
      if (container) container._tuiCommandOrder = [...container.children];
    });

    // cmdk selects the first item on mount and scrolls it into view.
    selectFirstItem(root);
  }

  function init() {
    document.querySelectorAll("[data-tui-command]").forEach(setup);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
  // Re-init on any childList mutation, directly (never rAF-deferred: rAF
  // does not fire in hidden tabs or throttled iframes): swapped-in markup
  // wires itself.
  new MutationObserver(() => init()).observe(document.body, { childList: true, subtree: true });

  // ----- events -------------------------------------------------------------

  document.addEventListener("input", (e) => {
    if (!(e.target instanceof Element) || !e.target.hasAttribute("data-tui-command-input")) return;
    const root = rootFor(e.target);
    if (root) onSearchChange(root, e.target.value);
  });

  document.addEventListener("keydown", (e) => {
    if (!(e.target instanceof Element)) return;
    const root = rootFor(e.target);
    if (!root) return;

    // Ignore keystrokes while an IME composition is in progress.
    if (e.defaultPrevented || e.isComposing || e.keyCode === 229) return;

    const next = () => {
      e.preventDefault();
      if (e.metaKey) {
        updateSelectedToIndex(root, getValidItems(root).length - 1);
      } else if (e.altKey) {
        updateSelectedByGroup(root, 1);
      } else {
        updateSelectedByItem(root, 1);
      }
    };
    const prev = () => {
      e.preventDefault();
      if (e.metaKey) {
        updateSelectedToIndex(root, 0);
      } else if (e.altKey) {
        updateSelectedByGroup(root, -1);
      } else {
        updateSelectedByItem(root, -1);
      }
    };

    switch (e.key) {
      case "n":
      case "j": {
        // vim keybind down
        if (e.ctrlKey) next();
        break;
      }
      case "ArrowDown": {
        next();
        break;
      }
      case "p":
      case "k": {
        // vim keybind up
        if (e.ctrlKey) prev();
        break;
      }
      case "ArrowUp": {
        prev();
        break;
      }
      case "Home": {
        e.preventDefault();
        updateSelectedToIndex(root, 0);
        break;
      }
      case "End": {
        e.preventDefault();
        updateSelectedToIndex(root, getValidItems(root).length - 1);
        break;
      }
      case "Enter": {
        e.preventDefault();
        const item = getSelectedItem(root);
        if (item && item.getAttribute("aria-disabled") !== "true") activateItem(root, item);
        break;
      }
    }
  });

  document.addEventListener("click", (e) => {
    if (!(e.target instanceof Element)) return;
    const item = e.target.closest(ITEM_SELECTOR);
    if (!item || item.getAttribute("aria-disabled") === "true") return;
    const root = rootFor(item);
    if (root) activateItem(root, item);
  });

  // Moving the pointer over an item selects it, exactly like cmdk.
  document.addEventListener("pointermove", (e) => {
    if (!(e.target instanceof Element)) return;
    const item = e.target.closest(ITEM_SELECTOR);
    if (!item || item.getAttribute("aria-disabled") === "true" || item.getAttribute("aria-selected") === "true")
      return;
    const root = rootFor(item);
    if (root) setSelected(root, item, { scroll: false });
  });

  // A closing dialog unmounts cmdk's state in shadcn's CommandDialog; reset
  // the palette so the next open starts fresh. dialog.js dispatches the
  // bubbling dialog-close event once the dialog finished closing.
  document.addEventListener("dialog-close", (e) => {
    if (!(e.target instanceof Element)) return;
    e.target.querySelectorAll("[data-tui-command]").forEach((root) => {
      const input = inputOf(root);
      if (input) input.value = "";
      onSearchChange(root, "");
    });
  });
})();

// components/contextmenu/contextmenu.js
// Uses window.FloatingUIDOM from components/floatingui (loaded in the same bundle).
(function () {
  const EXIT_MS = 120; // exit animation (duration-100) + slack
  const COLLISION_PADDING = 5;
  // Submenu hover intent, like Base UI: open fast, close with a grace delay so
  // moving the mouse diagonally into the submenu does not flicker.
  const SUB_OPEN_DELAY = 100;
  const SUB_CLOSE_DELAY = 300;

  const escapeTargets = new WeakSet();
  function listenForEscape(element) {
    if (!element || escapeTargets.has(element)) return;
    element.addEventListener("keydown", closeOnEscapeKeyDown);
    escapeTargets.add(element);
  }

  // useDismiss: popup/reference listeners stop Escape before outer document handlers.
  function closeOnEscapeKeyDown(event) {
    if (event.key !== "Escape") return;
    const contents = event.currentTarget === document
      ? allContents()
      : [event.currentTarget.hasAttribute("data-tui-contextmenu-content")
        ? event.currentTarget
        : contentFor(event.currentTarget)];
    let handled = false;
    for (const content of contents) {
      if (!content?.hasAttribute("data-open")) continue;
      if (requestOpenChange(content, false)) event.preventDefault();
      event.stopPropagation();
      handled = true;
    }
    return handled;
  }

  function allContents() {
    return document.querySelectorAll("[data-tui-contextmenu-content]");
  }

  function contentFor(trigger) {
    return document.getElementById(trigger.getAttribute("data-tui-contextmenu-for") || "");
  }

  function triggerFor(content) {
    return document.querySelector(
      '[data-tui-contextmenu-trigger][data-tui-contextmenu-for="' + content.id + '"]',
    );
  }

  function popupFor(content) {
    return content.querySelector("[data-tui-contextmenu-popup]");
  }

  function setOpenState(element, open) {
    element.toggleAttribute("data-open", open);
    element.toggleAttribute("data-closed", !open);
  }

  function setState(content, state) {
    const open = state === "open";
    setOpenState(content, open);
    const popup = popupFor(content);
    if (popup) setOpenState(popup, open);
  }

  function setChecked(item, checked) {
    item.toggleAttribute("data-checked", checked);
    item.toggleAttribute("data-unchecked", !checked);
    item.setAttribute("aria-checked", checked ? "true" : "false");
  }

  function setSide(content, side) {
    content.setAttribute("data-side", side);
    const popup = popupFor(content);
    if (popup) popup.setAttribute("data-side", side);
  }

  // Base UI zooms the popup out of the anchor's center point, not out of a
  // placement corner. The anchor here is the cursor (a zero-size rect).
  function anchorOrigin(result, anchorRect, positionerRect, sideOffset) {
    const side = result.placement.split("-")[0];
    const centerX = anchorRect.left + anchorRect.width / 2 - positionerRect.left + "px";
    const centerY = anchorRect.top + anchorRect.height / 2 - positionerRect.top + "px";
    if (side === "bottom") return centerX + " " + -sideOffset + "px";
    if (side === "top") return centerX + " calc(100% + " + sideOffset + "px)";
    if (side === "right") return -sideOffset + "px " + centerY;
    return "calc(100% + " + sideOffset + "px) " + centerY;
  }

  // Moves the content to <body> (shadcn portals it the same way).
  // The unmount half of the React portal pendant: a portaled content lives
  // as long as its SSR declaration site (_tuiPortalOwner) stays in the
  // document. Trigger-presence heuristics judged mid-swap moments wrongly -
  // multi-phase swap layers briefly disconnect the new triggers.
  function removeOrphanedContents(content) {
    document.querySelectorAll("body > [data-tui-contextmenu-content]").forEach((c) => {
      if (c !== content && c._tuiPortalOwner && !c._tuiPortalOwner.isConnected) {
        c._tuiReleaseScroll?.();
        c._tuiReleaseScroll = null;
        c.remove();
      }
    });
  }

  function portal(content) {
    listenForEscape(content);
    removeOrphanedContents(content);
    if (content.parentElement !== document.body) {
      if (!content._tuiPortalOwner) content._tuiPortalOwner = content.parentElement;
      document.body.appendChild(content);
    }
  }

  // A zero-size rect at the cursor acts as the anchor element.
  function cursorAnchor(x, y) {
    return {
      getBoundingClientRect: function () {
        return { x: x, y: y, top: y, bottom: y, left: x, right: x, width: 0, height: 0 };
      },
    };
  }

  function positionMenu(content, x, y) {
    const { computePosition, offset, flip, shift, size } = window.FloatingUIDOM;
    // Base UI context menu placement: right-start against the cursor,
    // sideOffset 0, alignOffset 4.
    const side = content.getAttribute("data-tui-contextmenu-side") || "right";
    const sideOffset =
      parseInt(content.getAttribute("data-tui-contextmenu-side-offset"), 10) || 0;
    const alignOffset =
      parseInt(content.getAttribute("data-tui-contextmenu-align-offset"), 10) || 0;
    const anchor = cursorAnchor(x, y);

    return computePosition(anchor, content, {
      placement: side + "-start",
      strategy: "fixed",
      middleware: [
        offset({ mainAxis: sideOffset, alignmentAxis: alignOffset }),
        flip({ padding: COLLISION_PADDING }),
        shift({ padding: COLLISION_PADDING }),
        size({
          padding: COLLISION_PADDING,
          apply(args) {
            content.style.setProperty(
              "--tui-contextmenu-available-height",
              args.availableHeight + "px",
            );
          },
        }),
      ],
    }).then((result) => {
      content.style.left = result.x + "px";
      content.style.top = result.y + "px";
      setSide(content, result.placement.split("-")[0]);
      const popup = popupFor(content);
      if (popup) {
        popup.style.setProperty(
          "--tui-contextmenu-transform-origin",
          anchorOrigin(
            result,
            anchor.getBoundingClientRect(),
            content.getBoundingClientRect(),
            sideOffset,
          ),
        );
      }
    });
  }

  // ----- focus highlighting (Base UI moves real focus to menu items) --------

  const ITEM_SELECTOR = '[role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"]';

  function containerOf(el) {
    return el.closest("[data-tui-contextmenu-sub-content], [data-tui-contextmenu-popup]");
  }

  function itemsIn(container) {
    return [...container.querySelectorAll(ITEM_SELECTOR)].filter(
      (item) =>
        containerOf(item) === container &&
        !item.disabled &&
        item.getAttribute("aria-disabled") !== "true",
    );
  }

  // Focus waits until after the input task:
  // Chromium's mousedown default focuses the trigger, WebKit's clears focus.
  // One frame, like Base UI, with a guard for a popup that closed meanwhile.
  function enqueueFocus(el, shouldFocus) {
    if (!el) return;
    requestAnimationFrame(() => {
      if (shouldFocus && !shouldFocus()) return;
      el.focus({ preventScroll: true });
    });
  }

  function focusItem(item) {
    if (item && document.activeElement !== item) item.focus({ preventScroll: false });
  }

  // Wraps at both ends, the pendant of Menu.Root's loopFocus, which the
  // reference defaults to true: ArrowDown on the last item returns to the
  // first and ArrowUp on the first goes to the last. Disabled items stay out
  // of the walk — itemsIn filters them, because ours are natively disabled
  // buttons rather than the aria-disabled ones the reference keeps focusable.
  function moveFocus(container, delta) {
    const items = itemsIn(container);
    if (!items.length) return;
    const index = items.indexOf(document.activeElement);
    if (index === -1) {
      focusItem(delta > 0 ? items[0] : items[items.length - 1]);
      return;
    }
    focusItem(items[(index + delta + items.length) % items.length]);
  }

  // ----- open / close --------------------------------------------------------

  function openAt(content, x, y, touchOpen = false) {
    const alreadyOpen = content.hasAttribute("data-open");
    allContents().forEach((c) => {
    if (c !== content) requestOpenChange(c, false);
    });
    clearTimeout(content._tuiHide);
    portal(content);
    // z-index portal like shadcn (no native top layer); re-append
    // keeps paint order = open order.
    document.body.appendChild(content);
    content.hidden = false;

    if (alreadyOpen) {
      // Right-click somewhere else while open: move over to the new spot.
      content.querySelectorAll("[data-tui-contextmenu-sub]").forEach(closeSubNow);
      positionMenu(content, x, y).then(() => {
        if (!content.isConnected || !content.hasAttribute("data-open")) return;
        content._tuiReleaseScroll?.();
        content._tuiReleaseScroll = window.tui.scrollLock.anchoredPopup(
          true, touchOpen, content, triggerFor(content),
        );
      });
      return;
    }

    // Fresh open: position it invisibly first, then play the enter animation
    // at the cursor.
    content.style.visibility = "hidden";
    positionMenu(content, x, y).then(() => {
      if (content.hidden || !content.isConnected) return; // closed or removed meanwhile
      // duration-100 transitions `all`; a visibility transition would
      // freeze at hidden in background tabs - flip suppressed.
      const popup = popupFor(content);
      content.style.transitionProperty = "none";
      if (popup) popup.style.transitionProperty = "none";
      content.style.visibility = "";
      void content.offsetWidth;
      content.style.transitionProperty = "";
      if (popup) popup.style.transitionProperty = "";
      // useAnchoredPopupScrollLock: a native touch context menu follows the touch rule.
      content._tuiReleaseScroll?.();
      content._tuiReleaseScroll = window.tui.scrollLock.anchoredPopup(
        true, touchOpen, content, triggerFor(content),
      );
      setState(content, "open");
      if (popup) {
        syncSubState(popup);
        enqueueFocus(popup, () => content.hasAttribute("data-open"));
      }
    });
  }

  function close(content) {
    if (content.hidden) return;
    setState(content, "closed");
    content.querySelectorAll("[data-tui-contextmenu-sub]").forEach(closeSubNow);
    clearTimeout(content._tuiHide);
    content._tuiHide = setTimeout(() => {
      if (content.hasAttribute("data-closed") && !content.hidden) {
        content.hidden = true;
      }
    }, EXIT_MS);
    content._tuiReleaseScroll?.();
    content._tuiReleaseScroll = null;
  }

  function closeAll() {
  allContents().forEach((content) => requestOpenChange(content, false));
  }

  function requestOpenChange(content, nextOpen, x, y, touchOpen = false) {
  const trigger = triggerFor(content);
  const change = new CustomEvent("contextmenu-open-change", {
    bubbles: true,
    cancelable: true,
    detail: { open: nextOpen },
  });
  const accepted = (trigger || content).dispatchEvent(change);
  if (!accepted || content.hasAttribute("data-tui-contextmenu-controlled")) return false;
  if (nextOpen) openAt(content, x, y, touchOpen);
  else close(content);
  return true;
  }

  function anyOpen() {
    return [...allContents()].find((c) => c.hasAttribute("data-open")) || null;
  }

  // ----- submenus -------------------------------------------------------------

  function subParts(sub) {
    return {
      trigger: sub.querySelector("[data-tui-contextmenu-sub-trigger]"),
      content: sub.querySelector("[data-tui-contextmenu-sub-content]"),
    };
  }

  function openSub(sub, focusFirst) {
    const { trigger, content } = subParts(sub);
    if (!trigger || !content) return;
    content.classList.remove("hidden");
    content.style.visibility = "hidden";

    const { computePosition, offset, flip, shift } = window.FloatingUIDOM;
    // Base UI submenu placement: right-start, sideOffset 0, alignOffset -3.
    computePosition(trigger, content, {
      placement: "right-start",
      strategy: "fixed",
      middleware: [
        offset({ mainAxis: 0, alignmentAxis: -3 }),
        flip({ padding: COLLISION_PADDING }),
        shift({ padding: COLLISION_PADDING }),
      ],
    }).then((result) => {
      if (content.classList.contains("hidden")) return; // closed meanwhile
      content.style.transition = "none";
      content.style.left = result.x + "px";
      content.style.top = result.y + "px";
      content.setAttribute("data-side", result.placement.split("-")[0]);
      content.style.setProperty(
        "--tui-contextmenu-transform-origin",
        anchorOrigin(result, trigger.getBoundingClientRect(), content.getBoundingClientRect(), 0),
      );
      content.offsetHeight; // flush styles before re-enabling transitions
      content.style.transition = "";
      // duration-100 transitions `all`; a visibility transition would
      // freeze at hidden in background tabs - flip suppressed.
      content.style.transitionProperty = "none";
      content.style.visibility = "";
      void content.offsetWidth;
      content.style.transitionProperty = "";
      setOpenState(content, true);
      setOpenState(trigger, true);
	  trigger.setAttribute("aria-expanded", "true");
      if (focusFirst) focusItem(itemsIn(content)[0] || content);
    });
  }

  // Closes with the exit animation.
  function closeSub(sub) {
    const { trigger, content } = subParts(sub);
    if (!trigger || !content) return;
    setOpenState(content, false);
    setOpenState(trigger, false);
	trigger.setAttribute("aria-expanded", "false");
    setTimeout(() => {
      if (content.hasAttribute("data-closed")) {
        content.classList.add("hidden");
      }
    }, EXIT_MS);
  }

  // Closes immediately (used when the whole menu goes away).
  function closeSubNow(sub) {
    clearTimeout(sub._tuiOpen);
    clearTimeout(sub._tuiClose);
    sub._tuiOpen = null;
    sub._tuiClose = null;
    const { trigger, content } = subParts(sub);
    if (!trigger || !content) return;
    content.classList.add("hidden");
    setOpenState(content, false);
    setOpenState(trigger, false);
	trigger.setAttribute("aria-expanded", "false");
  }

  function requestSubOpenChange(sub, nextOpen, focusFirst) {
	const { trigger, content } = subParts(sub);
	if (!trigger || !content || content.hasAttribute("data-open") === nextOpen) return;
	const accepted = trigger.dispatchEvent(
	  new CustomEvent("contextmenu-sub-open-change", {
		bubbles: true,
		cancelable: true,
		detail: { open: nextOpen },
	  }),
	);
	if (!accepted || sub.hasAttribute("data-tui-contextmenu-sub-controlled")) return;
	sub.setAttribute("data-tui-contextmenu-sub-open", String(nextOpen));
	if (nextOpen) openSub(sub, focusFirst);
	else closeSub(sub);
  }

  function syncSubState(menu) {
	menu.querySelectorAll("[data-tui-contextmenu-sub]").forEach((sub) => {
	  const { content } = subParts(sub);
	  if (!content) return;
	  const shouldOpen = sub.getAttribute("data-tui-contextmenu-sub-open") === "true";
	  if (shouldOpen && !content.hasAttribute("data-open")) openSub(sub, false);
	  else if (!shouldOpen && content.hasAttribute("data-open")) closeSubNow(sub);
	});
  }

  // Hover intent: while the pointer is over a sub (trigger or its content),
  // keep it open; everything else in the menu schedules its subs to close.
  document.addEventListener("mouseover", (e) => {
    if (!(e.target instanceof Element)) return;
    const menu = e.target.closest("[data-tui-contextmenu-content]");
    if (!menu) return;
    const hovered = e.target.closest("[data-tui-contextmenu-sub]");

    menu.querySelectorAll("[data-tui-contextmenu-sub]").forEach((sub) => {
      const { content } = subParts(sub);
      if (!content) return;
      const isOpen = content.hasAttribute("data-open");
      const onPath = hovered && (sub === hovered || sub.contains(hovered));

      if (onPath) {
        clearTimeout(sub._tuiClose);
        sub._tuiClose = null;
        if (!isOpen && !sub._tuiOpen) {
          sub._tuiOpen = setTimeout(() => {
            sub._tuiOpen = null;
			requestSubOpenChange(sub, true);
          }, SUB_OPEN_DELAY);
        }
      } else {
        clearTimeout(sub._tuiOpen);
        sub._tuiOpen = null;
        if (isOpen && !sub._tuiClose) {
          sub._tuiClose = setTimeout(() => {
            sub._tuiClose = null;
			requestSubOpenChange(sub, false);
          }, SUB_CLOSE_DELAY);
        }
      }
    });
  });

  // The highlight follows the pointer: focus the item under it, fall back to
  // the menu container when the pointer sits on empty menu space.
  document.addEventListener("pointermove", (e) => {
    if (!(e.target instanceof Element)) return;
    const content = e.target.closest("[data-tui-contextmenu-content]");
    if (!content || !content.hasAttribute("data-open")) return;
    const item = e.target.closest(ITEM_SELECTOR);
    if (item && containerOf(item)) {
      focusItem(item);
    } else {
      const container = containerOf(e.target) || popupFor(content);
      if (container && !container.contains(document.activeElement)) return;
      if (container && document.activeElement !== container) {
        container.focus({ preventScroll: true });
      }
    }
  });

  // ----- init (portal on open) --------------------

  function init() {
    document.querySelectorAll("[data-tui-contextmenu-trigger]").forEach(listenForEscape);
    removeOrphanedContents();
    document.querySelectorAll("[data-tui-contextmenu-trigger]").forEach((trigger) => {
      const content = contentFor(trigger);
      if (content && content.getAttribute("data-tui-contextmenu-initial-open") === "true") {
        content.removeAttribute("data-tui-contextmenu-initial-open");
        const rect = trigger.getBoundingClientRect();
        openAt(content, rect.left + rect.width / 2, rect.top + rect.height / 2);
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
  // Re-init on any childList mutation, directly (never rAF-deferred: rAF
  // does not fire in hidden tabs or throttled iframes): swapped-in markup
  // wires itself, removals release portaled content through the
  // ownership sweep.
  new MutationObserver(() => init()).observe(document.body, { childList: true, subtree: true });

  // ----- events ---------------------------------------------------------------

  document.addEventListener("contextmenu", (e) => {
    if (!(e.target instanceof Element)) return;
    const trigger = e.target.closest("[data-tui-contextmenu-trigger]");
    if (!trigger) return;
    const content = contentFor(trigger);
    if (!content) return;
    e.preventDefault();
  requestOpenChange(content, true, e.clientX, e.clientY,
    (e.pointerType || trigger._tuiOpenMethod) === "touch");
  });

  // Dismiss on PRESS outside, like Base UI.
  document.addEventListener("pointerdown", (e) => {
    if (!(e.target instanceof Element)) return;
    const trigger = e.target.closest("[data-tui-contextmenu-trigger]");
    if (trigger) trigger._tuiOpenMethod = e.pointerType;
    if (e.button !== 0) return;
    if (!e.target.closest("[data-tui-contextmenu-content]")) closeAll();
  });

  document.addEventListener("click", (e) => {
    if (!(e.target instanceof Element)) return;
    // Clicking a submenu trigger opens it right away.
    const subTrigger = e.target.closest("[data-tui-contextmenu-sub-trigger]");
    if (subTrigger) {
      const sub = subTrigger.closest("[data-tui-contextmenu-sub]");
      if (sub) {
        clearTimeout(sub._tuiOpen);
        sub._tuiOpen = null;
		requestSubOpenChange(sub, true, e.detail === 0);
      }
      return;
    }

    // Checkbox items toggle and keep the menu open.
    const checkbox = e.target.closest("[data-tui-contextmenu-checkbox-item]");
    if (checkbox) {
      if (!checkbox.disabled) {
        const on = checkbox.hasAttribute("data-checked");
    const change = new CustomEvent("contextmenu-checked-change", {
      bubbles: true,
      cancelable: true,
      detail: { checked: !on },
    });
    const accepted = checkbox.dispatchEvent(change);
    if (accepted && !checkbox.hasAttribute("data-tui-contextmenu-checkbox-controlled")) {
      setChecked(checkbox, !on);
    }
      }
      return;
    }

    // Radio items select within their group and keep the menu open.
    const radio = e.target.closest("[data-tui-contextmenu-radio-item]");
    if (radio) {
      if (!radio.disabled) {
        const group = radio.closest("[data-tui-contextmenu-radio-group]");
    const change = new CustomEvent("contextmenu-value-change", {
      bubbles: true,
      cancelable: true,
      detail: { value: radio.getAttribute("data-tui-contextmenu-radio-value") },
    });
    const accepted = (group || radio).dispatchEvent(change);
    if (accepted && group && !group.hasAttribute("data-tui-contextmenu-radio-controlled")) {
          group.querySelectorAll("[data-tui-contextmenu-radio-item]").forEach((r) => {
            setChecked(r, false);
          });
      setChecked(radio, true);
        }
      }
      return;
    }

    const item = e.target.closest("[data-tui-contextmenu-item]");
    if (item) {
      if (
        item.getAttribute("aria-disabled") !== "true" &&
        item.getAttribute("data-tui-contextmenu-disable-close-on-click") !== "true"
      ) {
        const content = item.closest("[data-tui-contextmenu-content]");
    if (content) requestOpenChange(content, false);
      }
    }
  });

  document.addEventListener("keydown", (e) => {
    if (closeOnEscapeKeyDown(e)) return;
    const content = anyOpen();
    if (!content) return;

    if (e.key === "Tab") {
      closeAll();
      return;
    }

    const active = document.activeElement;
    if (!content.contains(active)) return;
    const container = containerOf(active) || popupFor(content);
    if (!container) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        moveFocus(container, 1);
        break;
      case "ArrowUp":
        e.preventDefault();
        moveFocus(container, -1);
        break;
      case "Home": {
        e.preventDefault();
        const items = itemsIn(container);
        focusItem(items[0]);
        break;
      }
      case "End": {
        e.preventDefault();
        const items = itemsIn(container);
        focusItem(items[items.length - 1]);
        break;
      }
      case "ArrowRight": {
        const subTrigger = active.closest("[data-tui-contextmenu-sub-trigger]");
        if (subTrigger) {
          e.preventDefault();
          const sub = subTrigger.closest("[data-tui-contextmenu-sub]");
		  if (sub) requestSubOpenChange(sub, true, true);
        }
        break;
      }
      case "ArrowLeft": {
        const subContent = active.closest("[data-tui-contextmenu-sub-content]");
        if (subContent) {
          e.preventDefault();
          const sub = subContent.closest("[data-tui-contextmenu-sub]");
          if (sub) {
            const { trigger } = subParts(sub);
			requestSubOpenChange(sub, false);
            if (trigger) trigger.focus({ preventScroll: true });
          }
        }
        break;
      }
    }
  });

  // Context menus close on scroll and resize (Base UI behavior: the anchor is
  // a point, there is nothing to stay attached to).
  window.addEventListener("scroll", closeAll, true);
  window.addEventListener("resize", closeAll);
})();

// components/dialog/dialog.js
(function () {
  "use strict";

  // Vanilla port of Base UI's Dialog (packages/react/src/dialog): the portal
  // node, backdrop and popup are SSRd divs; this script drives Base UI's
  // data-open/data-closed/data-starting-style/data-ending-style transition
  // lifecycle, the FloatingFocusManager focus trap (guards, initial focus,
  // return focus), useDismiss's escape/outside-press semantics, markOthers'
  // aria-hidden application to outside content and useScrollLock's deferred
  // body lock. "Unmount" is the portal node getting [hidden] again.

  // ----- registry ------------------------------------------------------------

  // Popup element -> per-dialog state. The open stack orders open dialogs by
  // open time (last = topmost), like Base UI's nested dialog counts.
  const dialogs = new Map();
  const openStack = [];

  function getDialog(target) {
    if (!target) return null;
    if (typeof target === "string") {
      const el = document.getElementById(target);
      return el && el.matches("[data-tui-dialog-content]") ? el : null;
    }
    if (target.matches?.("[data-tui-dialog-content]")) return target;
    return target.closest?.("[data-tui-dialog-content]") || null;
  }

  function stateOf(target) {
    const popup = getDialog(target);
    return popup ? dialogs.get(popup) : null;
  }

  function dialogFor(element) {
    const id =
      element.getAttribute("aria-controls") || element.getAttribute("data-tui-dialog-target");
    if (id) return getDialog(id);
    return getDialog(element);
  }

  function triggersFor(popup) {
    if (!popup.id) return [];
    return document.querySelectorAll(
      '[data-tui-dialog-trigger][aria-controls="' + popup.id + '"]',
    );
  }

  function isModal(state) {
    return state.popup.getAttribute("data-tui-dialog-show-modal") !== "false";
  }

  // ----- interaction type ----------------------------------------------------

  // FloatingFocusManager tracks the last pointer/keyboard interaction to pick
  // touch initial focus and keyboard-visible return focus.
  let lastInteractionType = "";
  document.addEventListener(
    "pointerdown",
    (event) => {
      lastInteractionType = event.pointerType || "mouse";
    },
    true,
  );
  document.addEventListener(
    "keydown",
    () => {
      lastInteractionType = "keyboard";
    },
    true,
  );

  // ----- tabbable (floating-ui-react/utils/tabbable.ts) ----------------------

  const CANDIDATE_SELECTOR =
    'a[href],button,input,select,textarea,summary,details,iframe,object,embed,[tabindex],[contenteditable]:not([contenteditable="false"]),audio[controls],video[controls]';

  function isFocusableElement(element) {
    if (
      !element.matches(CANDIDATE_SELECTOR) ||
      !element.isConnected ||
      element.matches(":disabled") ||
      (element.localName === "input" && element.type === "hidden")
    ) {
      return false;
    }
    for (let current = element; current; current = current.parentElement) {
      const isAncestor = current !== element;
      if (current.hasAttribute("inert") || current.hasAttribute("hidden")) return false;
      const style = getComputedStyle(current);
      if (style.display === "none") return false;
      if (!isAncestor && (style.visibility === "hidden" || style.visibility === "collapse")) {
        return false;
      }
      if (
        isAncestor &&
        current.localName === "details" &&
        !current.open &&
        !(current.querySelector(":scope > summary")?.contains(element))
      ) {
        return false;
      }
    }
    return true;
  }

  function getTabIndex(element) {
    const tabIndex = element.tabIndex;
    if (tabIndex < 0) {
      const name = element.localName;
      if (name === "details" || name === "audio" || name === "video" || element.isContentEditable) {
        return 0;
      }
    }
    return tabIndex;
  }

  function getNamedRadioInput(element) {
    return element.localName === "input" && element.type === "radio" && element.name !== ""
      ? element
      : null;
  }

  function isTabbableRadio(element, candidates) {
    const input = getNamedRadioInput(element);
    if (!input) return true;
    const group = candidates.filter((candidate) => {
      const radio = getNamedRadioInput(candidate);
      return radio && radio.name === input.name && radio.form === input.form;
    });
    const checked = group.find((radio) => radio.checked);
    return checked ? checked === input : group[0] === input;
  }

  function focusable(container) {
    return Array.from(container.querySelectorAll(CANDIDATE_SELECTOR)).filter(isFocusableElement);
  }

  function tabbable(container) {
    const candidates = focusable(container);
    return candidates.filter(
      (element) => getTabIndex(element) >= 0 && isTabbableRadio(element, candidates),
    );
  }

  function isTabbable(element) {
    return isFocusableElement(element) && getTabIndex(element) >= 0;
  }

  // FloatingFocusManager.getFirstTabbableElement: the element if it is
  // tabbable, otherwise its first tabbable child, otherwise itself.
  // (handleTabIndex is not ported: it early-returns for elements with an
  // authored tabindex, and FOCUSABLE_POPUP_PROPS always renders the dialog
  // popup with tabindex="-1" — ours is SSRd the same way and never changes.)
  function getFirstTabbableElement(container) {
    if (!container) return null;
    if (isTabbable(container)) return container;
    return tabbable(container)[0] || container;
  }

  // floating-ui-react/utils/enqueueFocus: focus lands on the next frame; a
  // newer enqueue cancels the previous one.
  let focusFrame = 0;
  function enqueueFocus(el, options = {}) {
    if (!el) return;
    cancelAnimationFrame(focusFrame);
    focusFrame = requestAnimationFrame(() => {
      if (options.shouldFocus && !options.shouldFocus()) return;
      el.focus(options);
    });
  }

  // ----- markOthers (floating-ui-react/utils/markOthers.ts) ------------------

  // Applies aria-hidden="true" to everything outside the open dialogs, with
  // reference counting so nested opens undo cleanly. aria-live regions are
  // kept, like Base UI. (Base UI's modal dialogs use aria-hidden, not inert:
  // pointer interaction is blocked by the full-viewport backdrop.)
  const ariaHiddenCounts = new WeakMap();
  const ariaHiddenUncontrolled = new WeakSet();

  function collectOutsideElements(keepElements, stopElements) {
    const outside = [];
    const walk = (parent) => {
      if (!parent || stopElements.has(parent)) return;
      for (const node of parent.children) {
        if (node.localName === "script") continue;
        if (keepElements.has(node)) {
          walk(node);
        } else {
          outside.push(node);
        }
      }
    };
    walk(document.body);
    return outside;
  }

  function buildKeepSet(targets) {
    const keep = new Set();
    targets.forEach((target) => {
      let node = target;
      while (node && !keep.has(node)) {
        keep.add(node);
        node = node.parentElement;
      }
    });
    return keep;
  }

  function markOthers(avoidElements) {
    const controlElements = avoidElements.concat(
      Array.from(document.body.querySelectorAll("[aria-live]")),
    );
    const targets = collectOutsideElements(
      buildKeepSet(controlElements),
      new Set(controlElements),
    );
    const hiddenElements = [];

    targets.forEach((node) => {
      const attr = node.getAttribute("aria-hidden");
      const alreadyHidden = attr !== null && attr !== "false";
      const count = (ariaHiddenCounts.get(node) || 0) + 1;
      ariaHiddenCounts.set(node, count);
      hiddenElements.push(node);
      if (count === 1 && alreadyHidden) ariaHiddenUncontrolled.add(node);
      if (!alreadyHidden) node.setAttribute("aria-hidden", "true");
    });

    return () => {
      hiddenElements.forEach((node) => {
        const count = (ariaHiddenCounts.get(node) || 0) - 1;
        ariaHiddenCounts.set(node, count);
        if (count <= 0) {
          if (!ariaHiddenUncontrolled.has(node)) node.removeAttribute("aria-hidden");
          ariaHiddenUncontrolled.delete(node);
        }
      });
    };
  }

  // ----- aria wiring (useDialogTitle/-Description registration) --------------

  function wireAria(state) {
    const popup = state.popup;
    const title = popup.querySelector("[data-tui-dialog-title]");
    if (title) {
      if (!title.id) title.id = popup.id + "-title";
      popup.setAttribute("aria-labelledby", title.id);
    } else {
      popup.removeAttribute("aria-labelledby");
    }
    const description = popup.querySelector("[data-tui-dialog-description]");
    if (description) {
      if (!description.id) description.id = popup.id + "-description";
      popup.setAttribute("aria-describedby", description.id);
    } else {
      popup.removeAttribute("aria-describedby");
    }
  }

  // ----- transition lifecycle ------------------------------------------------

  function setTransitionAttributes(state, attrs) {
    [state.backdrop, state.popup].forEach((el) => {
      if (!el) return;
      ["data-open", "data-closed", "data-starting-style", "data-ending-style"].forEach((name) => {
        if (attrs.includes(name)) {
          el.setAttribute(name, "");
        } else {
          el.removeAttribute(name);
        }
      });
    });
  }

  // useOpenChangeComplete/useAnimationsFinished: wait for every animation and
  // transition on the popup to finish, then run fn (a resolved microtask runs
  // before the browser paints the post-animation frame, so hiding here never
  // flashes the natural styles, like Base UI's flushSync unmount).
  function whenAnimationsFinish(state, fn) {
    const token = {};
    state.finishToken = token;
    const popup = state.popup;
    if (typeof popup.getAnimations !== "function") {
      fn();
      return;
    }
    // Base UI waits on the popup's animations only (useOpenChangeComplete's
    // ref is the popup); the backdrop uses the same durations.
    Promise.allSettled(popup.getAnimations().map((animation) => animation.finished)).then(() => {
      if (state.finishToken === token) fn();
    });
  }

  // ----- nested dialog bookkeeping ------------------------------------------

  // A dialog is nested when its hidden portal node was SSRd inside another
  // dialog's content — the DOM pendant of Base UI's parent DialogRootContext. The
  // relation is recorded at registration (see ensureDialog); parentOf resolves
  // it to the parent's live state.
  function parentOf(state) {
    const parentId = state.root.getAttribute("data-tui-dialog-parent");
    return parentId ? stateOf(parentId) : null;
  }

  function nestedOpenCount(state) {
    return openStack.filter((other) => {
      for (let p = parentOf(other); p; p = parentOf(p)) {
        if (p === state) return true;
      }
      return false;
    }).length;
  }

  function updateNestedAttributes() {
    openStack.forEach((state) => {
      const count = nestedOpenCount(state);
      state.popup.style.setProperty("--nested-dialogs", String(count));
      state.popup.toggleAttribute("data-nested-dialog-open", count > 0);
    });
  }

  function isTopmost(state) {
    return nestedOpenCount(state) === 0;
  }

  // ----- open / close --------------------------------------------------------

  function updateTriggers(state, isOpen) {
    triggersFor(state.popup).forEach((trigger) => {
      trigger.setAttribute("aria-expanded", isOpen ? "true" : "false");
      trigger.toggleAttribute("data-popup-open", isOpen);
    });
  }

  function openDialog(target, trigger) {
    const state = stateOf(target);
    if (!state || state.open) return;
    state.finishToken = null; // cancel a pending exit unmount

    const popup = state.popup;
    state.openType = trigger ? lastInteractionType || "mouse" : null;
    state.trigger =
      trigger && trigger instanceof Element ? trigger : triggersFor(popup)[0] || null;
    state.previouslyFocused = document.activeElement;

    state.open = true;
    openStack.push(state);
    updateNestedAttributes();

    // FloatingPortal appends at open time, keeping paint order = open order.
    document.body.appendChild(state.root);
    state.root.hidden = false;

    wireAria(state);

    // useTransitionStatus: mount with data-open + data-starting-style, drop
    // the starting style a frame later so CSS transitions see the start
    // values (the reflow guarantees they were computed).
    setTransitionAttributes(state, ["data-open", "data-starting-style"]);
    void popup.offsetWidth;
    requestAnimationFrame(() => {
      if (state.open) setTransitionAttributes(state, ["data-open"]);
    });

    if (isModal(state)) {
      state.releaseScroll = window.tui.scrollLock.acquire(popup);
      state.undoMarkOthers = markOthers([state.root]);
    }

    updateTriggers(state, true);

    // FloatingFocusManager initial focus: first tabbable element, or the
    // popup itself — also when opened by touch, so the virtual keyboard
    // stays closed (createDefaultInitialFocus).
    queueMicrotask(() => {
      if (!state.open) return;
      if (popup.contains(document.activeElement)) return;
      const elToFocus =
        state.openType === "touch" ? popup : tabbable(popup)[0] || popup;
      enqueueFocus(elToFocus, {
        preventScroll: elToFocus === popup,
        shouldFocus() {
          if (!state.open) return false;
          const active = document.activeElement;
          return !(active !== elToFocus && popup.contains(active));
        },
      });
    });
  }

  function closeDialog(target) {
    const state = stateOf(target);
    if (!state || !state.open) return;

    const popup = state.popup;
    state.open = false;
    state.closeType = lastInteractionType;
    const index = openStack.indexOf(state);
    if (index !== -1) openStack.splice(index, 1);
    updateNestedAttributes();

    // Base UI order on open=false: the transition status flips to ending,
    // aria-hidden marking and the scroll lock release immediately, the
    // popup unmounts (and focus returns) once the exit animation finishes.
    setTransitionAttributes(state, ["data-closed", "data-ending-style"]);
    if (state.undoMarkOthers) {
      state.undoMarkOthers();
      state.undoMarkOthers = null;
    }
    state.releaseScroll?.();
    state.releaseScroll = null;
    updateTriggers(state, false);

    whenAnimationsFinish(state, () => {
      state.root.hidden = true;
      setTransitionAttributes(state, []);
      popup.style.removeProperty("--nested-dialogs");
      popup.removeAttribute("data-nested-dialog-open");
      returnFocus(state);
      // onOpenChangeComplete(false) pendant: fires once the exit animation
      // finished and the dialog unmounted (command.js resets its palette on
      // this).
      popup.dispatchEvent(new CustomEvent("dialog-close", { bubbles: true }));
    });
  }

  // FloatingFocusManager return focus: the trigger (or the previously
  // focused element for programmatic opens), resolved to its first tabbable,
  // focused without scrolling — visibly when the dialog was closed with the
  // keyboard. Focus that legitimately moved elsewhere is respected.
  function returnFocus(state) {
    const referenceReturn = state.trigger?.isConnected ? state.trigger : null;
    const previousReturn =
      state.previouslyFocused?.isConnected &&
      state.previouslyFocused.localName !== "body"
        ? state.previouslyFocused
        : null;
    const preferPreviousFocus = state.openType == null;
    const returnElement = preferPreviousFocus
      ? previousReturn || referenceReturn
      : referenceReturn || previousReturn;

    queueMicrotask(() => {
      const tabbableReturnElement = getFirstTabbableElement(returnElement);
      if (!tabbableReturnElement) return;
      const active = document.activeElement;
      const focusMovedElsewhere =
        tabbableReturnElement !== active &&
        active !== document.body &&
        !state.popup.contains(active) &&
        !state.root.contains(active);
      if (focusMovedElsewhere) return;
      const options = { preventScroll: true };
      if (state.closeType === "keyboard") options.focusVisible = true;
      tabbableReturnElement.focus(options);
    });
  }

  function isDialogOpen(target) {
    return stateOf(target)?.open || false;
  }

  function requestOpenChange(target, nextOpen, trigger) {
    const state = stateOf(target);
    if (!state || state.open === nextOpen) return false;
    const accepted = state.popup.dispatchEvent(
      new CustomEvent("dialog-open-change", {
        bubbles: true,
        cancelable: true,
        detail: { open: nextOpen },
      }),
    );
    if (!accepted || state.popup.hasAttribute("data-tui-dialog-controlled")) return false;
    if (nextOpen) openDialog(state.popup, trigger);
    else closeDialog(state.popup);
    return true;
  }

  function toggleDialog(target, trigger) {
    requestOpenChange(target, !isDialogOpen(target), trigger);
  }

  // ----- dismissal (useDismiss + DialogInteractions) -------------------------

  // With a rendered backdrop, Base UI's outsidePressEvent is 'intentional':
  // the dismissal fires on the click that completes a press on the dialog's
  // owning backdrop, only for the topmost dialog, only for the main button.
  // A press that starts inside the popup and is released over the backdrop
  // (text selection drag-out) never dismisses.
  let pressStartedInPopup = null;
  document.addEventListener(
    "pointerdown",
    (event) => {
      pressStartedInPopup =
        event.target instanceof Element
          ? event.target.closest("[data-tui-dialog-content]")
          : null;
    },
    true,
  );

  function handleBackdropClick(backdrop, event) {
    const state = stateOf(backdrop.parentElement?.querySelector("[data-tui-dialog-content]"));
    if (!state || !state.open) return;
    if (state.popup.hasAttribute("data-tui-dialog-disable-dismissible")) return;
    if (!isTopmost(state)) return;
    if (event.button !== 0) return;
    if (pressStartedInPopup === state.popup) return;
    requestOpenChange(state.popup, false);
  }

  // useDismiss escape key: closes the topmost dialog, ignoring presses that
  // settle an IME composition (Safari fires compositionend before keydown,
  // so the flag is cleared a few ms later there).
  let isComposing = false;
  let compositionTimer;
  const isWebkit =
    typeof navigator !== "undefined" && /AppleWebKit/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
  document.addEventListener("compositionstart", () => {
    window.clearTimeout(compositionTimer);
    isComposing = true;
  });
  document.addEventListener("compositionend", () => {
    compositionTimer = window.setTimeout(
      () => {
        isComposing = false;
      },
      isWebkit ? 5 : 0,
    );
  });

  const escapeTargets = new WeakSet();
  function listenForEscape(element) {
    if (!element || escapeTargets.has(element)) return;
    element.addEventListener("keydown", closeOnEscapeKeyDown);
    escapeTargets.add(element);
  }

  // useDismiss installs the same handler on the popup, reference and document.
  function closeOnEscapeKeyDown(event) {
    if (event.key !== "Escape" || isComposing) return;
    const top = openStack[openStack.length - 1];
    const state = event.currentTarget === document
      ? top
      : stateOf(dialogFor(event.currentTarget));
    // A nested open dialog blocks its parent's useDismiss handler.
    if (!state?.open || state !== top) return;
    if (requestOpenChange(state.popup, false)) event.preventDefault();
    event.stopPropagation();
    return true;
  }

  document.addEventListener("keydown", (event) => {
    if (closeOnEscapeKeyDown(event)) return;
    // FloatingFocusManager: prevent Tab from escaping the modal when the
    // popup has no tabbable elements (the guards would have nothing to
    // focus).
    if (event.key === "Tab") {
      const state = openStack.find(
        (other) => isModal(other) && other.popup.contains(document.activeElement),
      );
      if (state && tabbable(state.popup).length === 0) {
        event.preventDefault();
        event.stopPropagation();
      }
    }
  });

  // ----- initialization ------------------------------------------------------

  // FocusGuard: visually hidden tabbable sentinels around the popup; focusing
  // one wraps focus to the other end of the popup's tab cycle.
  function createFocusGuard() {
    const guard = document.createElement("span");
    guard.setAttribute("tabindex", "0");
    guard.setAttribute("aria-hidden", "true");
    guard.setAttribute("data-tui-dialog-focus-guard", "");
    guard.style.cssText =
      "clip-path:inset(50%);overflow:hidden;white-space:nowrap;border:0;padding:0;width:1px;height:1px;margin:-1px;position:fixed;top:0;left:0;";
    return guard;
  }

  function ensureDialog(root) {
    const popup = root.querySelector("[data-tui-dialog-content]");
    if (!popup || dialogs.has(popup)) return dialogs.get(popup) || null;

    const parentPopup = root.parentElement?.closest("[data-tui-dialog-content]");
    if (parentPopup?.id) root.setAttribute("data-tui-dialog-parent", parentPopup.id);
    if (!root._tuiPortalOwner) root._tuiPortalOwner = root.parentElement;

    const state = {
      root,
      popup,
      backdrop: root.querySelector("[data-tui-dialog-backdrop]"),
      open: false,
      trigger: null,
      previouslyFocused: null,
      openType: null,
      closeType: "",
      undoMarkOthers: null,
      releaseScroll: null,
      finishToken: null,
    };
    dialogs.set(popup, state);
    listenForEscape(popup);

    // A nested dialog renders no backdrop in Base UI (DialogBackdrop's
    // enabled: !nested); the parent's backdrop keeps covering the page.
    if (root.hasAttribute("data-tui-dialog-parent")) {
      popup.setAttribute("data-nested", "");
      if (state.backdrop) state.backdrop.hidden = true;
    }

    const beforeGuard = createFocusGuard();
    const afterGuard = createFocusGuard();
    if (!isModal(state)) {
      // Non-modal dialogs do not trap focus: the guards stay out of the tab
      // order (Base UI renders different non-modal guard behavior; without a
      // React portal boundary the natural tab order is the equivalent).
      beforeGuard.setAttribute("tabindex", "-1");
      afterGuard.setAttribute("tabindex", "-1");
    }
    popup.before(beforeGuard);
    popup.after(afterGuard);
    beforeGuard.addEventListener("focus", () => {
      if (!isModal(state)) return;
      const els = tabbable(popup);
      enqueueFocus(els[els.length - 1] || popup, { preventScroll: els.length === 0 });
    });
    afterGuard.addEventListener("focus", () => {
      if (!isModal(state)) return;
      const els = tabbable(popup);
      enqueueFocus(els[0] || popup, { preventScroll: els.length === 0 });
    });

    // FloatingFocusManager restoreFocus="popup": when the focused element is
    // removed from inside the popup (e.g. an htmx swap of the dialog body),
    // focus falls back to the popup instead of escaping to <body>.
    popup.addEventListener("focusout", (event) => {
      const target = event.target;
      queueMicrotask(() => {
        if (!state.open) return;
        if (target instanceof Element && target.isConnected) return;
        if (document.activeElement === document.body) {
          popup.focus();
          requestAnimationFrame(() => {
            if (state.open && document.activeElement === document.body) popup.focus();
          });
        }
      });
    });

    wireAria(state);
    return state;
  }

  // Fully retire a dialog: undo aria-hidden marking, release the scroll
  // lock and remove the portaled DOM. Used when an htmx/datastar swap
  // removed the dialog's source from the page or replaced it with a fresh
  // hidden portal node.
  function destroyDialog(popup) {
    const state = dialogs.get(popup);
    if (!state) {
      popup.closest("[data-tui-dialog-root]")?.remove();
      return;
    }
    state.finishToken = null;
    if (state.undoMarkOthers) {
      state.undoMarkOthers();
      state.undoMarkOthers = null;
    }
    const index = openStack.indexOf(state);
    if (index !== -1) openStack.splice(index, 1);
    const wasOpen = state.open;
    state.open = false;
    updateNestedAttributes();
    state.releaseScroll?.();
    state.releaseScroll = null;
    if (wasOpen) popup.dispatchEvent(new CustomEvent("dialog-close", { bubbles: true }));
    state.root.remove();
    dialogs.delete(popup);
  }

  function init() {
    document.querySelectorAll("[data-tui-dialog-trigger]").forEach(listenForEscape);
    // A dialog lives as long as its SSR declaration site (_tuiPortalOwner)
    // stays in the document, including trigger-less programmatic dialogs.
    // Retire registered dialogs even when their root itself was removed.
    dialogs.forEach((state, popup) => {
      if (!state.root.isConnected || (state.root._tuiPortalOwner && !state.root._tuiPortalOwner.isConnected)) {
        destroyDialog(popup);
      }
    });
    document.querySelectorAll("[data-tui-dialog-root]").forEach((root) => {
      const popup = root.querySelector("[data-tui-dialog-content]");
      if (!popup) {
        root.remove();
        return;
      }

      if (dialogs.has(popup)) return;

      const fresh = ensureDialog(root);
      if (!fresh) return;

      if (popup.getAttribute("data-tui-dialog-initial-open") === "true") {
        // One-shot: consume the attribute so a later re-init never re-opens
        // a closed dialog.
        popup.removeAttribute("data-tui-dialog-initial-open");
        openDialog(popup);
      }
    });
  }

  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;
    const trigger = event.target.closest("[data-tui-dialog-trigger]");
    if (trigger) {
      toggleDialog(dialogFor(trigger), trigger);
      return;
    }
    const closeButton = event.target.closest("[data-tui-dialog-close]");
    if (closeButton) {
      requestOpenChange(dialogFor(closeButton), false);
      return;
    }
    const backdrop = event.target.closest("[data-tui-dialog-backdrop]");
    if (backdrop) {
      handleBackdropClick(backdrop, event);
    }
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => init());
  } else {
    init();
  }

  // Initialize dialogs added later (e.g. swapped in via htmx), so a
  // server-rendered dialog with Open true still opens. Also retire dialogs
  // whose source got swapped out of the DOM (releasing the scroll lock and
  // the aria-hidden marking).
  new MutationObserver(() => {
    init();
  }).observe(document.body, {
    childList: true,
    subtree: true,
  });

  window.tui = window.tui || {};
  window.tui.dialog = {
    open: openDialog,
    close: closeDialog,
    toggle: toggleDialog,
    isOpen: isDialogOpen,
  };
})();

// components/drawer/drawer.js
(function () {
  "use strict";

  // Gesture constants, 1:1 from Base UI (packages/react/src/utils/useSwipeDismiss.ts
  // and packages/react/src/drawer/viewport/DrawerViewport.tsx).
  const MIN_SWIPE_THRESHOLD = 10; // px floor for the dismiss threshold
  const FAST_SWIPE_VELOCITY = 0.5; // px/ms, a flick dismisses regardless of distance
  const SNAP_VELOCITY_THRESHOLD = 0.5;
  const SNAP_VELOCITY_MULTIPLIER = 300;
  const MAX_SNAP_VELOCITY = 4;
  const MIN_VELOCITY_DURATION_MS = 50;
  const MIN_RELEASE_VELOCITY_DURATION_MS = 16;
  const MAX_RELEASE_VELOCITY_AGE_MS = 80;
  const MIN_SWIPE_RELEASE_VELOCITY = 0.2;
  const MAX_SWIPE_RELEASE_VELOCITY = 4;
  const MIN_SWIPE_RELEASE_DURATION_MS = 80;
  const MAX_SWIPE_RELEASE_DURATION_MS = 360;
  const MIN_SWIPE_RELEASE_SCALAR = 0.1;
  const MAX_SWIPE_RELEASE_SCALAR = 1;
  const AXIS_LOCK_SLOP = 6;
  const AXIS_LOCK_BIAS = 2;
  // Base UI's DEFAULT_IGNORE_SELECTOR: mouse swipes never start on these.
  // Touch swipes may (ignoreSelectorWhenTouch: false in DrawerViewport).
  const IGNORE_SELECTOR = 'button,a,input,select,textarea,label,[role="button"]';
  // The ending transition is duration-450, or strength*400ms after a swipe;
  // the fallback timer only fires when no transform transition runs at all.
  const CLOSE_FALLBACK_MS = 500;

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  // Displacement of (dx, dy) along the dismiss direction (useSwipeDismiss
  // getDisplacement).
  function displacement(direction, dx, dy) {
    switch (direction) {
      case "up":
        return -dy;
      case "down":
        return dy;
      case "left":
        return -dx;
      case "right":
        return dx;
      default:
        return 0;
    }
  }

  // ----- the drawer parts ----------------------------------------------------
  //
  // The <dialog> is the Drawer.Viewport (fullscreen, hosts the listeners),
  // the popup div is Drawer.Popup, the overlay div is DrawerOverlay (only
  // rendered for modal, non-nested drawers). Lifecycle attributes and swipe
  // vars land on popup and overlay, exactly where Base UI puts them.

  function popupOf(dialog) {
    return dialog.querySelector(":scope > [data-tui-drawer-popup]");
  }

  function overlayOf(dialog) {
    return dialog.querySelector(":scope > [data-tui-drawer-overlay]");
  }

  function setPartsAttr(dialog, name, on) {
    const popup = popupOf(dialog);
    const overlay = overlayOf(dialog);
    if (popup) popup.toggleAttribute(name, on);
    if (overlay) overlay.toggleAttribute(name, on);
  }

  function directionOf(dialog) {
    return popupOf(dialog)?.getAttribute("data-swipe-direction") || "down";
  }

  function axisIsY(dialog) {
    const d = directionOf(dialog);
    return d === "down" || d === "up";
  }

  // Current translate/scale from the computed transform matrix
  // (useSwipeDismiss getElementTransform), so a grab during the spring-back
  // continues from the on-screen position instead of jumping.
  function getTransform(element) {
    const transform = window.getComputedStyle(element).transform;
    let x = 0;
    let y = 0;
    let scale = 1;
    if (transform && transform !== "none") {
      const matrix = transform.match(/matrix(?:3d)?\(([^)]+)\)/);
      if (matrix) {
        const values = matrix[1].split(", ").map(parseFloat);
        if (values.length === 6) {
          x = values[4];
          y = values[5];
          scale = Math.sqrt(values[0] * values[0] + values[1] * values[1]);
        } else if (values.length === 16) {
          x = values[12];
          y = values[13];
          scale = values[0];
        }
      }
    }
    return { x, y, scale };
  }

  // Resolves a <dialog data-tui-drawer-content> from an id, the element
  // itself, or anything inside it.
  function getDrawer(target) {
    if (!target) return null;
    if (typeof target === "string") {
      const el = document.getElementById(target);
      return el && el.matches("dialog[data-tui-drawer-content]") ? ensureDrawer(el) : null;
    }
    if (target.matches?.("dialog[data-tui-drawer-content]")) return ensureDrawer(target);
    return ensureDrawer(target.closest?.("dialog[data-tui-drawer-content]") || null);
  }

  function drawerFor(element) {
    const id =
      element.getAttribute("aria-controls") || element.getAttribute("data-tui-drawer-target");
    if (id) return getDrawer(id);
    return getDrawer(element);
  }

  function triggersFor(dialog) {
    if (!dialog.id) return [];
    return document.querySelectorAll(
      '[data-tui-drawer-trigger][aria-controls="' + dialog.id + '"]',
    );
  }

  function updateState(dialog, isOpen) {
    triggersFor(dialog).forEach((trigger) => {
      trigger.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });
  }

  // ----- nested drawers ------------------------------------------------------
  //
  // A Drawer rendered inside another Drawer's subtree carries
  // data-tui-drawer-parent (the SSR pendant of Base UI's context nesting).
  // Everything below is recomputed from the DOM on every state change, so
  // swapped-in or swapped-out drawers never leave stale stacking state.

  function parentOf(dialog) {
    const id = dialog.getAttribute("data-tui-drawer-parent");
    if (!id) return null;
    const el = document.getElementById(id);
    return el && el.matches("dialog[data-tui-drawer-content]") ? el : null;
  }

  function ancestorsOf(dialog) {
    const chain = [];
    let current = parentOf(dialog);
    while (current && !chain.includes(current)) {
      chain.push(current);
      current = parentOf(current);
    }
    return chain;
  }

  function hasOpenNested(dialog) {
    return popupOf(dialog)?.hasAttribute("data-nested-drawer-open") || false;
  }

  // Mirrors the child's swipe progress into every ancestor popup
  // (DrawerRoot's onNestedSwipeProgressChange chain: the var feeds
  // --stack-progress, easing the parent back to the front while the child is
  // dragged away).
  function notifyAncestors(dialog, progress) {
    ancestorsOf(dialog).forEach((ancestor) => {
      const popup = popupOf(ancestor);
      if (popup) popup.style.setProperty("--drawer-swipe-progress", String(progress));
    });
  }

  function setAncestorsSwiping(dialog, on) {
    ancestorsOf(dialog).forEach((ancestor) => {
      const popup = popupOf(ancestor);
      if (popup) popup.toggleAttribute("data-nested-drawer-swiping", on);
    });
  }

  // Recomputes the whole nested-drawer stack: --nested-drawers counts,
  // data-nested-drawer-open, --drawer-frontmost-height and the --drawer-height
  // pin (DrawerPopup keeps the measured height while a nested drawer is
  // present or the popup is animating out; otherwise the height stays auto).
  function syncStack() {
    const dialogs = Array.from(document.querySelectorAll("dialog[data-tui-drawer-content]"));
    if (!dialogs.length) return;

    const info = new Map();
    dialogs.forEach((d) => {
      info.set(d, { openDesc: 0, present: false, frontmost: 0, frontmostDepth: -1 });
    });

    for (const d of dialogs) {
      const popup = popupOf(d);
      if (!popup) continue;
      const closing = popup.hasAttribute("data-ending-style");
      if (!d.open && !closing) continue;
      const chain = ancestorsOf(d);
      // A closing drawer no longer counts as open (Base UI flips `open`
      // before the exit transition) but still pins the parents' heights
      // (`present`: open || transitionStatus === 'ending').
      for (const ancestor of chain) {
        const ai = info.get(ancestor);
        if (!ai) continue;
        ai.present = true;
        if (d.open && !closing) {
          ai.openDesc += 1;
          // The frontmost drawer of the stack is the deepest open one.
          const depth = chain.length; // distance of d below the root, relative depth works per ancestor
          if (depth > ai.frontmostDepth) {
            ai.frontmostDepth = depth;
            ai.frontmost = d._tuiHeight || popup.offsetHeight;
          }
        }
      }
    }

    for (const d of dialogs) {
      const popup = popupOf(d);
      if (!popup || !d.open) continue;
      const i = info.get(d);
      const closing = popup.hasAttribute("data-ending-style");
      if (i.openDesc === 0 && !closing) {
        // Measure while unobstructed; the cached value is what gets pinned
        // once a nested drawer opens (DrawerPopup keepHeightWhileNested).
        d._tuiHeight = popup.offsetHeight;
      }
      popup.style.setProperty("--nested-drawers", String(i.openDesc));
      popup.toggleAttribute("data-nested-drawer-open", i.openDesc > 0);
      if (i.openDesc > 0 && i.frontmost > 0) {
        popup.style.setProperty("--drawer-frontmost-height", i.frontmost + "px");
      } else {
        popup.style.removeProperty("--drawer-frontmost-height");
      }
      if (i.present && d._tuiHeight > 0) {
        popup.style.setProperty("--drawer-height", d._tuiHeight + "px");
      } else if (!closing) {
        popup.style.removeProperty("--drawer-height");
      }
      if (i.openDesc === 0) {
        popup.removeAttribute("data-nested-drawer-swiping");
        popup.style.setProperty("--drawer-swipe-progress", "0");
      }
    }
  }

  // ----- snap points ---------------------------------------------------------
  //
  // Port of packages/react/src/drawer/root/useDrawerSnapPoints.ts plus the
  // snap branches of DrawerViewport. Snap points apply to vertical drawers;
  // the config is read once from data-tui-drawer-snap-points (JSON, the SSR
  // pendant of the snapPoints prop) and kept on the element itself so
  // swapped-out drawers take their state with them.

  function snapStateOf(dialog) {
    if (dialog._tuiSnap !== undefined) return dialog._tuiSnap;
    const raw = dialog.getAttribute("data-tui-drawer-snap-points");
    let points = null;
    if (raw) {
      try {
        points = JSON.parse(raw);
      } catch {
        points = null;
      }
    }
    if (!Array.isArray(points) || points.length === 0) {
      dialog._tuiSnap = null;
      return null;
    }
    dialog._tuiSnap = {
      points,
      resolved: [],
      active: points[0],
      popupHeight: 0,
      sequential: dialog.hasAttribute("data-tui-drawer-snap-sequential"),
    };
    return dialog._tuiSnap;
  }

  // Resolves the vertical swipe movement for a snap point, damping the drag
  // once it overshoots the fully-open edge (useDrawerSnapPoints
  // getSnapPointSwipeMovement).
  function getSnapPointSwipeMovement(baseOffset, movementValue) {
    const nextOffset = baseOffset + movementValue;
    if (nextOffset >= 0) return movementValue;
    return -Math.sqrt(-nextOffset) - baseOffset;
  }

  // Numbers <= 1 are viewport fractions, > 1 pixels; strings take px/rem
  // (useDrawerSnapPoints resolveSnapPointValue).
  function resolveSnapValue(value, viewportHeight, rootFontSize) {
    if (!isFinite(viewportHeight) || viewportHeight <= 0) return null;
    if (typeof value === "number") {
      if (!isFinite(value)) return null;
      if (value <= 1) return clamp(value, 0, 1) * viewportHeight;
      return value;
    }
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    if (trimmed.endsWith("px")) {
      const parsed = Number.parseFloat(trimmed);
      return isFinite(parsed) ? parsed : null;
    }
    if (trimmed.endsWith("rem")) {
      const parsed = Number.parseFloat(trimmed);
      return isFinite(parsed) ? parsed * rootFontSize : null;
    }
    return null;
  }

  function closestSnapPointIndex(values, target) {
    let closestIndex = -1;
    let closestDistance = Infinity;
    for (let index = 0; index < values.length; index += 1) {
      const distance = Math.abs(values[index] - target);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    }
    return closestIndex;
  }

  // Resolves the configured snap points against the current viewport and
  // popup size (useDrawerSnapPoints resolvedSnapPoints, including the
  // last-wins dedupe of near-equal heights).
  function resolveSnapPoints(dialog) {
    const snap = snapStateOf(dialog);
    if (!snap) return;
    const popup = popupOf(dialog);
    const viewportHeight = dialog.clientHeight || document.documentElement.clientHeight;
    const rootFontSize =
      parseFloat(window.getComputedStyle(document.documentElement).fontSize) || 16;
    const popupHeight = popup ? popup.offsetHeight : 0;
    snap.popupHeight = popupHeight;
    if (viewportHeight <= 0 || popupHeight <= 0) {
      snap.resolved = [];
      return;
    }
    const maxHeight = Math.min(popupHeight, viewportHeight);
    const resolved = [];
    for (const value of snap.points) {
      const height = resolveSnapValue(value, viewportHeight, rootFontSize);
      if (height === null) continue;
      const clamped = clamp(height, 0, maxHeight);
      resolved.push({ value, height: clamped, offset: Math.max(0, popupHeight - clamped) });
    }
    const deduped = [];
    const seenHeights = [];
    for (let index = resolved.length - 1; index >= 0; index -= 1) {
      const point = resolved[index];
      if (seenHeights.some((height) => Math.abs(height - point.height) <= 1)) continue;
      seenHeights.push(point.height);
      deduped.push(point);
    }
    deduped.reverse();
    snap.resolved = deduped;
  }

  // The offset of the active snap point; falls back to the closest resolved
  // point when the active value has no exact match (useDrawerSnapPoints
  // resolvedActiveSnapPoint).
  function activeSnapOffset(dialog, snap) {
    if (snap.active === null || snap.active === undefined) return null;
    const exact = snap.resolved.find((point) => Object.is(point.value, snap.active));
    if (exact) return exact.offset;
    if (!snap.resolved.length) return null;
    const viewportHeight = dialog.clientHeight || document.documentElement.clientHeight;
    const rootFontSize =
      parseFloat(window.getComputedStyle(document.documentElement).fontSize) || 16;
    const resolvedHeight = resolveSnapValue(snap.active, viewportHeight, rootFontSize);
    if (resolvedHeight === null) return null;
    const clamped = clamp(resolvedHeight, 0, Math.min(snap.popupHeight, viewportHeight));
    const index = closestSnapPointIndex(
      snap.resolved.map((point) => point.height),
      clamped,
    );
    return index === -1 ? null : snap.resolved[index].offset;
  }

  // The offset range between the two lowest snap points, used for the
  // overlay progress with snap points (DrawerViewport snapPointRange).
  function snapRangeOf(dialog, snap) {
    if (!snap || snap.points.length < 2 || snap.resolved.length < 2 || !axisIsY(dialog)) {
      return null;
    }
    const offsets = snap.resolved.map((point) => point.offset).sort((a, b) => a - b);
    return { minOffset: offsets[0], range: offsets[1] - offsets[0] };
  }

  // Applies the active snap point: --drawer-snap-point-offset on the popup
  // (negative for `up`, DrawerPopup snapPointOffsetValue), data-expanded at
  // the full snap point (activeSnapPoint === 1) and the steady-state overlay
  // progress between snap points.
  function applySnapState(dialog) {
    const snap = snapStateOf(dialog);
    const popup = popupOf(dialog);
    if (!snap || !popup || !axisIsY(dialog)) return;
    const offset = activeSnapOffset(dialog, snap);
    const direction = directionOf(dialog);
    popup.style.setProperty(
      "--drawer-snap-point-offset",
      offset === null ? "0px" : (direction === "up" ? -offset : offset) + "px",
    );
    popup.toggleAttribute("data-expanded", snap.active === 1);
    const overlay = overlayOf(dialog);
    const range = snapRangeOf(dialog, snap);
    if (overlay && range && range.range > 0 && offset !== null) {
      overlay.style.setProperty(
        "--drawer-swipe-progress",
        String(clamp((offset - range.minOffset) / range.range, 0, 1)),
      );
    }
  }

  // Re-resolve snap offsets when the viewport resizes (the reference
  // observes the viewport and popup with a ResizeObserver).
  function watchSnapResize(dialog) {
    if (dialog._tuiSnapRO || typeof ResizeObserver !== "function") return;
    if (!snapStateOf(dialog)) return;
    dialog._tuiSnapRO = new ResizeObserver(() => {
      if (!dialog.open || popupOf(dialog)?.hasAttribute("data-swiping")) return;
      resolveSnapPoints(dialog);
      applySnapState(dialog);
    });
    dialog._tuiSnapRO.observe(dialog);
  }

  function unwatchSnapResize(dialog) {
    if (dialog._tuiSnapRO) {
      dialog._tuiSnapRO.disconnect();
      delete dialog._tuiSnapRO;
    }
  }

  function resetSwipeVars(dialog) {
    const popup = popupOf(dialog);
    const overlay = overlayOf(dialog);
    if (popup) {
      popup.style.setProperty("--drawer-swipe-movement-x", "0px");
      popup.style.setProperty("--drawer-swipe-movement-y", "0px");
      popup.style.setProperty("--drawer-swipe-progress", "0");
      popup.style.setProperty("--drawer-swipe-strength", "1");
    }
    if (overlay) {
      overlay.style.setProperty("--drawer-swipe-progress", "0");
      overlay.style.setProperty("--drawer-swipe-strength", "1");
    }
  }

  function cleanupClosed(dialog) {
    setPartsAttr(dialog, "data-ending-style", false);
    setPartsAttr(dialog, "data-starting-style", false);
    setPartsAttr(dialog, "data-swiping", false);
    const popup = popupOf(dialog);
    if (popup) {
      popup.style.removeProperty("transform");
      popup.style.removeProperty("transition");
      popup.style.removeProperty("--drawer-height");
      popup.style.removeProperty("--drawer-frontmost-height");
      popup.style.setProperty("--nested-drawers", "0");
      popup.style.setProperty("--drawer-snap-point-offset", "0px");
      popup.removeAttribute("data-nested-drawer-open");
      popup.removeAttribute("data-nested-drawer-swiping");
      popup.removeAttribute("data-expanded");
    }
    resetSwipeVars(dialog);
    // Closing resets the snap point to the default (DrawerRoot
    // handleOpenChange), ready for the next open.
    const snap = snapStateOf(dialog);
    if (snap) snap.active = snap.points[0];
    unwatchSnapResize(dialog);
    updateState(dialog, false);
    dialog._tuiReleaseScroll?.();
    dialog._tuiReleaseScroll = null;
    syncInert();
    // Return focus to where the drawer was opened from, if focus is still
    // ours to give back.
    if (
      dialog._tuiPreviousFocus?.isConnected &&
      (dialog.contains(document.activeElement) || document.activeElement === document.body)
    ) {
      dialog._tuiPreviousFocus.focus({ preventScroll: true });
    }
    delete dialog._tuiPreviousFocus;
    syncStack();
  }

  // The hand-built half of showModal's modality: while a modal drawer is
  // open, every body-level sibling is inert - except the surfaces carrying
  // the shared data-tui-portal marker (floating popups, dialogs, the
  // toaster). inert removes the rest from tab order and the accessibility
  // tree: floating-ui's markOthers-with-inert pendant, without knowing any
  // component by name.
  function syncInert() {
    const anyModalOpen = Array.from(
      document.querySelectorAll("body > dialog[data-tui-drawer-content]"),
    ).some(
      (d) =>
        d.open &&
        d.getAttribute("data-modal") === "true" &&
        // A closing drawer no longer counts (Base UI removes markOthers at
        // dismiss start, not after the exit transition).
        !popupOf(d)?.hasAttribute("data-ending-style"),
    );
    for (const node of document.body.children) {
      if (node.localName === "script" || node.matches("[data-tui-portal]")) continue;
      node.toggleAttribute("inert", anyModalOpen);
    }
  }

  const escapeTargets = new WeakSet();
  function listenForEscape(element) {
    if (!element || escapeTargets.has(element)) return;
    element.addEventListener("keydown", closeOnEscapeKeyDown);
    escapeTargets.add(element);
  }

  // useDismiss: the focused popup or reference handles Escape before document.
  function closeOnEscapeKeyDown(event) {
    if (event.key !== "Escape") return;
    const drawer = event.currentTarget === document
      ? [...document.querySelectorAll("body > dialog[data-tui-drawer-content]")].find(
        (dialog) => dialog.open && !dialog.hasAttribute("data-tui-drawer-disable-dismissible") && !hasOpenNested(dialog),
      )
      : drawerFor(event.currentTarget);
    if (!drawer?.open || drawer.hasAttribute("data-tui-drawer-disable-dismissible") || hasOpenNested(drawer)) return;
    if (requestOpenChange(drawer, false)) event.preventDefault();
    event.stopPropagation();
    return true;
  }

  document.addEventListener("keydown", closeOnEscapeKeyDown);

  function openDrawer(target) {
    const dialog = getDrawer(target);
    if (!dialog) return;
    const popup = popupOf(dialog);
    if (!popup) return;

    window.clearTimeout(dialog._tuiCloseTimer);
    delete dialog._tuiCloseTimer;
    setPartsAttr(dialog, "data-ending-style", false);

    if (!dialog.open) {
      resetSwipeVars(dialog);
      // Base UI mounts the popup with its starting style (the off-screen
      // --closed-transform); painting that state first makes the removal
      // below transition the panel in (450ms cubic-bezier(0.22,1,0.36,1)).
      setPartsAttr(dialog, "data-starting-style", true);
      try {
        // Modal drawers open non-modally too: shadcn/Base UI never use the
        // native top layer (it would stack above the z-index portaled
        // popups). Modality - scroll lock, inert siblings, focus - is
        // built by hand, like Base UI does.
        portal(dialog);
        dialog.show();
        if (dialog.getAttribute("data-tui-dialog-show-modal") === "true") {
          dialog._tuiReleaseScroll = window.tui.scrollLock.acquire(dialog);
          dialog._tuiPreviousFocus = document.activeElement;
          syncInert();
          (popupOf(dialog) || dialog).focus({ preventScroll: true });
        }
      } catch {
        setPartsAttr(dialog, "data-starting-style", false);
        return;
      }
      // With layout available, resolve the snap points and seed the default
      // snap offset so the enter transition lands on the first snap point.
      if (snapStateOf(dialog) && axisIsY(dialog)) {
        resolveSnapPoints(dialog);
        applySnapState(dialog);
        watchSnapResize(dialog);
      }
    }

    void popup.offsetWidth;
    setPartsAttr(dialog, "data-starting-style", false);
    updateState(dialog, true);
    syncStack();
  }

  // strength is Base UI's --drawer-swipe-strength scalar: the ending
  // transition runs for strength*400ms. 1 for non-swipe closes.
  function closeDrawer(target, strength) {
    const dialog = getDrawer(target);
    if (!dialog) return;
    const popup = popupOf(dialog);

    if (!dialog.open || !popup) {
      updateState(dialog, false);
      return;
    }
    if (popup.hasAttribute("data-ending-style")) return;

    // Pin the measured height for the exit (DrawerPopup sets --drawer-height
    // while transitionStatus is 'ending'), so the panel cannot collapse
    // mid-transition.
    const height = popup.offsetHeight;
    if (height > 0) popup.style.setProperty("--drawer-height", height + "px");

    const value =
      typeof strength === "number" && isFinite(strength) && strength > 0 ? strength : 1;
    popup.style.setProperty("--drawer-swipe-strength", String(value));
    const overlay = overlayOf(dialog);
    if (overlay) overlay.style.setProperty("--drawer-swipe-strength", String(value));
    setPartsAttr(dialog, "data-ending-style", true);
    updateState(dialog, false);
    syncInert();
    if (
      dialog._tuiPreviousFocus?.isConnected &&
      (dialog.contains(document.activeElement) || document.activeElement === document.body)
    ) {
      dialog._tuiPreviousFocus.focus({ preventScroll: true });
    }
    delete dialog._tuiPreviousFocus;
    // The stack treats a closing drawer as closed (Base UI flips `open`
    // before the exit transition), so the parent starts scaling forward now.
    syncStack();

    const finish = () => {
      popup.removeEventListener("transitionend", onTransitionEnd);
      window.clearTimeout(dialog._tuiCloseTimer);
      delete dialog._tuiCloseTimer;
      if (dialog.open) dialog.close(); // the close handler runs cleanupClosed
      else cleanupClosed(dialog);
    };
    const onTransitionEnd = (event) => {
      if (event.target === popup && event.propertyName === "transform") finish();
    };
    popup.addEventListener("transitionend", onTransitionEnd);
    dialog._tuiCloseTimer = window.setTimeout(finish, CLOSE_FALLBACK_MS);
  }

  function isDrawerOpen(target) {
    return getDrawer(target)?.open || false;
  }

  function requestOpenChange(target, nextOpen, strength) {
    const dialog = getDrawer(target);
    if (!dialog || dialog.open === nextOpen) return false;
    const accepted = dialog.dispatchEvent(
      new CustomEvent("drawer-open-change", {
        bubbles: true,
        cancelable: true,
        detail: { open: nextOpen },
      }),
    );
    if (!accepted || dialog.hasAttribute("data-tui-drawer-controlled")) return false;
    if (nextOpen) openDrawer(dialog);
    else closeDrawer(dialog, strength);
    return true;
  }

  function toggleDrawer(target) {
    requestOpenChange(target, !isDrawerOpen(target));
  }

  // Sets the active snap point (the pendant of the controlled snapPoint
  // prop) and animates the popup to it.
  function setSnapPoint(target, value) {
    const dialog = getDrawer(target);
    if (!dialog) return;
    const snap = snapStateOf(dialog);
    if (!snap) return;
    snap.active = value;
    if (dialog.open) {
      resolveSnapPoints(dialog);
      applySnapState(dialog);
    }
  }

  function getSnapPoint(target) {
    const dialog = getDrawer(target);
    const snap = dialog ? snapStateOf(dialog) : null;
    return snap ? snap.active : null;
  }

  // ----- swipe to dismiss ----------------------------------------------------
  //
  // Port of the Base UI drawer gesture (useSwipeDismiss + DrawerViewport):
  // - the <dialog> viewport hosts the listeners, exactly like DrawerViewport
  // - mouse swipes start on the panel chrome (popup minus [data-slot=
  //   drawer-content] minus interactive elements), touch swipes anywhere in
  //   the popup: the reference's isDrawerContentTarget /
  //   ignoreSelectorWhenTouch behavior
  // - with snap points, both vertical directions are legal (directions
  //   ['down','up']) and the release snaps instead of dismissing
  // - swiping is disabled while a nested drawer is open on top (enabled:
  //   mounted && !nestedDrawerOpen)
  // - scroll arbitration keeps the reference's rules (claim the gesture at the
  //   scroller's dismiss edge, yield to cross-axis scrolling past a 6px slop)
  //   but drops iOS pinch/text-selection special cases

  function findScrollable(start, boundary, vertical) {
    let el = start instanceof Element ? start : null;
    while (el && el !== boundary) {
      if (el instanceof HTMLElement) {
        const overflow = window.getComputedStyle(el)[vertical ? "overflowY" : "overflowX"];
        const scrollable = overflow === "auto" || overflow === "scroll";
        const overflows = vertical
          ? el.scrollHeight > el.clientHeight
          : el.scrollWidth > el.clientWidth;
        if (scrollable && overflows) return el;
      }
      el = el.parentElement;
    }
    return null;
  }

  // Dismissing toward down/right swipes from the scroller's start edge,
  // up/left from its end edge (DrawerViewport isAtSwipeStartEdge).
  function atDismissEdge(scroller, direction) {
    if (direction === "down") return scroller.scrollTop <= 0;
    if (direction === "up")
      return scroller.scrollTop >= Math.max(0, scroller.scrollHeight - scroller.clientHeight);
    if (direction === "right") return scroller.scrollLeft <= 0;
    return scroller.scrollLeft >= Math.max(0, scroller.scrollWidth - scroller.clientWidth);
  }

  function movingTowardDismiss(direction, delta) {
    return direction === "down" || direction === "right" ? delta > 0 : delta < 0;
  }

  // Maps release velocity to Base UI's --drawer-swipe-strength scalar
  // (DrawerViewport resolveSwipeRelease): the faster the flick and the
  // shorter the remaining distance, the shorter the exit transition. With
  // snap points, the active snap offset already shifted the popup along the
  // dismiss direction and counts toward the travelled distance.
  function resolveSwipeStrength(dialog, size, disp, releaseVelocity, overallVelocity) {
    let base = 0;
    const snap = snapStateOf(dialog);
    if (snap && axisIsY(dialog) && snap.resolved.length > 0) {
      const offset = activeSnapOffset(dialog, snap);
      if (offset !== null) base = offset;
    }
    const remaining = Math.max(0, size - (base + disp));
    if (size <= 0 || remaining <= 0) return 1;
    const velocity = Math.abs(releaseVelocity) > 0 ? releaseVelocity : overallVelocity;
    if (velocity <= MIN_SWIPE_RELEASE_VELOCITY) return 1;
    const clamped = clamp(velocity, MIN_SWIPE_RELEASE_VELOCITY, MAX_SWIPE_RELEASE_VELOCITY);
    const durationMs = clamp(
      remaining / clamped,
      MIN_SWIPE_RELEASE_DURATION_MS,
      MAX_SWIPE_RELEASE_DURATION_MS,
    );
    const normalized =
      (durationMs - MIN_SWIPE_RELEASE_DURATION_MS) /
      (MAX_SWIPE_RELEASE_DURATION_MS - MIN_SWIPE_RELEASE_DURATION_MS);
    return MIN_SWIPE_RELEASE_SCALAR + normalized * (MAX_SWIPE_RELEASE_SCALAR - MIN_SWIPE_RELEASE_SCALAR);
  }

  function attachSwipe(dialog) {
    const state = {
      swiping: false,
      pointerId: null,
      startX: 0,
      startY: 0,
      startTime: 0,
      initial: { x: 0, y: 0, scale: 1 },
      offsetX: 0,
      offsetY: 0,
      size: 0,
      lastSample: null,
      lastVelX: 0,
      lastVelY: 0,
      nestedActive: false,
      touch: null,
    };

    function startSwipe(x, y, time) {
      const popup = popupOf(dialog);
      if (!popup) return;
      state.swiping = true;
      state.startX = x;
      state.startY = y;
      state.startTime = time;
      state.initial = getTransform(popup);
      state.offsetX = state.initial.x;
      state.offsetY = state.initial.y;
      state.size = axisIsY(dialog) ? popup.offsetHeight : popup.offsetWidth;
      state.lastSample = { x: state.initial.x, y: state.initial.y, time };
      state.lastVelX = 0;
      state.lastVelY = 0;
      state.nestedActive = false;
      setPartsAttr(dialog, "data-swiping", true);
      // Freeze the element under the pointer (useSwipeDismiss syncDragStyles).
      popup.style.transition = "none";
      // A mouse drag with an expanded selection inside the popup would drag
      // the selection instead (useDrawerSwipe onSwipeStart clears it).
      const selection = document.getSelection?.();
      if (selection && !selection.isCollapsed) selection.removeAllRanges();
    }

    function moveSwipe(x, y, time) {
      if (!state.swiping) return;
      const popup = popupOf(dialog);
      if (!popup) return;
      const direction = directionOf(dialog);
      const vertical = axisIsY(dialog);
      const rawDX = x - state.startX;
      const rawDY = y - state.startY;
      const snap = snapStateOf(dialog);
      const snapActive = Boolean(snap && vertical && snap.resolved.length > 0);

      // Directional damping (useSwipeDismiss applyDirectionalDamping):
      // movement toward dismiss passes 1:1, movement past the resting point
      // is damped to sign(d)*|d|^0.5. Only the drawer axis translates. With
      // snap points both vertical directions are allowed, so no damping
      // applies on the axis (directions ['down','up']).
      const damp = (v) => Math.sign(v) * Math.sqrt(Math.abs(v));
      let dx = 0;
      let dy = 0;
      if (vertical) {
        dy = snapActive || movingTowardDismiss(direction, rawDY) ? rawDY : damp(rawDY);
      } else {
        dx = movingTowardDismiss(direction, rawDX) ? rawDX : damp(rawDX);
      }

      state.offsetX = state.initial.x + dx;
      state.offsetY = state.initial.y + dy;
      const deltaX = state.offsetX - state.initial.x;
      const deltaY = state.offsetY - state.initial.y;
      const baseOffset = snapActive ? (activeSnapOffset(dialog, snap) ?? 0) : 0;

      if (snapActive && direction === "down") {
        // Snap-point drag (DrawerViewport onProgress with snap points): the
        // movement var drives the CSS translate, overshoot past fully open
        // is square-root damped (getSnapPointSwipeMovement); no frozen
        // inline transform.
        popup.style.removeProperty("transform");
        popup.style.setProperty("--drawer-swipe-movement-x", "0px");
        popup.style.setProperty(
          "--drawer-swipe-movement-y",
          getSnapPointSwipeMovement(baseOffset, deltaY) + "px",
        );
      } else {
        popup.style.transform =
          "translate3d(" +
          state.offsetX +
          "px," +
          state.offsetY +
          "px,0) scale(" +
          state.initial.scale +
          ")";
        popup.style.setProperty("--drawer-swipe-movement-x", deltaX + "px");
        popup.style.setProperty("--drawer-swipe-movement-y", deltaY + "px");
      }

      // Progress drives the overlay fade. With a snap point range, progress
      // maps the current offset between the two lowest snap points
      // (DrawerViewport offsetToProgress); otherwise it is displacement over
      // the panel size.
      let progress = 0;
      const range = snapActive ? snapRangeOf(dialog, snap) : null;
      if (range && range.range > 0 && snap.popupHeight > 0) {
        progress = clamp(
          (clamp(baseOffset + deltaY, 0, snap.popupHeight) - range.minOffset) / range.range,
          0,
          1,
        );
      } else {
        const disp = displacement(direction, deltaX, deltaY);
        const scale = state.initial.scale || 1;
        progress = state.size > 0 && disp > 0 ? clamp(disp / (state.size * scale), 0, 1) : 0;
      }
      const overlay = overlayOf(dialog);
      if (overlay) overlay.style.setProperty("--drawer-swipe-progress", String(progress));

      // Nested drawer: mirror the progress into the ancestor popups and flag
      // them as nested-swiping once the gesture passes the 10px threshold
      // (DrawerViewport updateNestedSwipeActive).
      if (dialog.getAttribute("data-tui-drawer-parent")) {
        notifyAncestors(dialog, progress);
        if (
          !state.nestedActive &&
          Math.abs(displacement(direction, deltaX, deltaY)) >= MIN_SWIPE_THRESHOLD
        ) {
          state.nestedActive = true;
          setAncestorsSwiping(dialog, true);
        }
      }

      if (state.lastSample && time > state.lastSample.time) {
        const durationMs = Math.max(
          time - state.lastSample.time,
          MIN_RELEASE_VELOCITY_DURATION_MS,
        );
        state.lastVelX = (state.offsetX - state.lastSample.x) / durationMs;
        state.lastVelY = (state.offsetY - state.lastSample.y) / durationMs;
      }
      state.lastSample = { x: state.offsetX, y: state.offsetY, time };
    }

    function finishNestedSwipe(progress) {
      if (dialog.getAttribute("data-tui-drawer-parent")) {
        notifyAncestors(dialog, progress);
      }
      state.nestedActive = false;
      setAncestorsSwiping(dialog, false);
    }

    function endSwipe(time) {
      if (!state.swiping) return;
      state.swiping = false;
      state.pointerId = null;
      setPartsAttr(dialog, "data-swiping", false);
      const popup = popupOf(dialog);
      if (!popup) return;

      const direction = directionOf(dialog);
      const vertical = axisIsY(dialog);
      const deltaX = state.offsetX - state.initial.x;
      const deltaY = state.offsetY - state.initial.y;
      const disp = displacement(direction, deltaX, deltaY);

      // Overall gesture velocity, floored at 50ms (useSwipeDismiss handleEnd).
      const durationMs =
        time > state.startTime ? Math.max(time - state.startTime, MIN_VELOCITY_DURATION_MS) : 0;
      const overallVelocity = durationMs > 0 ? disp / durationMs : 0;
      const overallVelY = durationMs > 0 ? deltaY / durationMs : 0;

      // Release velocity from the last drag sample, discarded when stale
      // (pointer rested >80ms before release).
      let relVelX = state.lastVelX;
      let relVelY = state.lastVelY;
      if (state.lastSample && time - state.lastSample.time > MAX_RELEASE_VELOCITY_AGE_MS) {
        relVelX = 0;
        relVelY = 0;
      }
      const releaseVelocity = displacement(direction, relVelX, relVelY);

      popup.style.removeProperty("transition");
      popup.style.removeProperty("transform");

      const snap = snapStateOf(dialog);
      const snapActive = Boolean(snap && vertical && snap.resolved.length > 0);

      if (snapActive && snap.popupHeight > 0) {
        // DrawerViewport onRelease with snap points: the release picks the
        // next snap point (or close) from drag distance plus a velocity
        // offset.
        const popupHeight = snap.popupHeight;
        const dragDelta = direction === "down" ? deltaY : -deltaY;
        const dragDirection = Math.sign(dragDelta);
        const releaseDirectional = direction === "down" ? relVelY : -relVelY;
        const fallbackDirectional = direction === "down" ? overallVelY : -overallVelY;
        let resolvedVelocity = releaseDirectional;
        if (dragDirection !== 0 && Math.abs(dragDelta) >= MIN_SWIPE_THRESHOLD) {
          const velocityDirection = Math.sign(resolvedVelocity);
          if (velocityDirection !== 0 && velocityDirection !== dragDirection) {
            // Ignore touch reversals that would otherwise flip the snap
            // decision.
            resolvedVelocity = fallbackDirectional;
          }
        }

        const currentOffset = activeSnapOffset(dialog, snap) ?? 0;
        const dragTargetOffset = clamp(currentOffset + dragDelta, 0, popupHeight);
        const velocityOffset =
          Math.abs(resolvedVelocity) >= SNAP_VELOCITY_THRESHOLD
            ? clamp(resolvedVelocity, -MAX_SNAP_VELOCITY, MAX_SNAP_VELOCITY) *
              SNAP_VELOCITY_MULTIPLIER
            : 0;
        const targetOffset = snap.sequential
          ? dragTargetOffset
          : clamp(dragTargetOffset + velocityOffset, 0, popupHeight);

        const closeFromSnapPoints = () => {
          // Compute the strength while the active snap offset still counts
          // toward the travelled distance (resolveSwipeRelease reads it
          // before setActiveSnapPoint(null) flushes).
          const strength = resolveSwipeStrength(
            dialog,
            popupHeight,
            disp,
            releaseVelocity,
            overallVelocity,
          );
          const previousActive = snap.active;
          snap.active = null;
          finishNestedSwipe(0);
          if (!requestOpenChange(dialog, false, strength)) {
            snap.active = previousActive;
            applySnapState(dialog);
            popup.style.setProperty("--drawer-swipe-movement-x", "0px");
            popup.style.setProperty("--drawer-swipe-movement-y", "0px");
          }
        };
        const settle = (point) => {
          snap.active = point.value;
          applySnapState(dialog);
          void popup.offsetWidth;
          popup.style.setProperty("--drawer-swipe-movement-x", "0px");
          popup.style.setProperty("--drawer-swipe-movement-y", "0px");
          finishNestedSwipe(0);
        };

        if (snap.sequential) {
          // snapToSequentialPoints: drag distance decides, velocity only
          // advances to the adjacent point.
          const ordered = [...snap.resolved].sort((a, b) => a.offset - b.offset);
          const offsets = ordered.map((point) => point.offset);
          const currentIndex = closestSnapPointIndex(offsets, currentOffset);
          let targetSnapPoint = ordered[closestSnapPointIndex(offsets, targetOffset)];
          const velocityDirection = Math.sign(resolvedVelocity);
          const shouldAdvance =
            dragDirection !== 0 &&
            velocityDirection !== 0 &&
            velocityDirection === dragDirection &&
            Math.abs(resolvedVelocity) >= SNAP_VELOCITY_THRESHOLD;
          let effectiveTargetOffset = targetOffset;
          if (shouldAdvance) {
            const adjacentIndex = clamp(currentIndex + dragDirection, 0, ordered.length - 1);
            if (adjacentIndex !== currentIndex) {
              const adjacentPoint = ordered[adjacentIndex];
              const shouldForceAdjacent =
                dragDirection > 0
                  ? targetOffset < adjacentPoint.offset
                  : targetOffset > adjacentPoint.offset;
              if (shouldForceAdjacent) {
                targetSnapPoint = adjacentPoint;
                effectiveTargetOffset = adjacentPoint.offset;
              }
            } else if (dragDirection > 0) {
              closeFromSnapPoints();
              return;
            }
          }
          const closeDistance = Math.abs(effectiveTargetOffset - popupHeight);
          const snapDistance = Math.abs(effectiveTargetOffset - targetSnapPoint.offset);
          if (closeDistance < snapDistance) {
            closeFromSnapPoints();
            return;
          }
          settle(targetSnapPoint);
          return;
        }

        if (resolvedVelocity >= FAST_SWIPE_VELOCITY && dragDelta > 0) {
          closeFromSnapPoints();
          return;
        }
        const closestSnapPoint =
          snap.resolved[
            closestSnapPointIndex(
              snap.resolved.map((point) => point.offset),
              targetOffset,
            )
          ];
        const closeDistance = Math.abs(targetOffset - popupHeight);
        if (closeDistance < Math.abs(targetOffset - closestSnapPoint.offset)) {
          closeFromSnapPoints();
          return;
        }
        settle(closestSnapPoint);
        return;
      }

      // Dismiss on a flick (>=0.5px/ms) or past half the panel's size
      // (DrawerViewport onRelease + getBaseSwipeThreshold).
      const threshold = Math.max(state.size * 0.5, MIN_SWIPE_THRESHOLD);
      const shouldClose = disp > 0 && (overallVelocity >= FAST_SWIPE_VELOCITY || disp > threshold);

      if (shouldClose) {
        finishNestedSwipe(0);
        const closed = requestOpenChange(
          dialog,
          false,
          resolveSwipeStrength(dialog, state.size, disp, releaseVelocity, overallVelocity),
        );
        if (closed) return;
      }

      // Spring back: hand the transform to the movement vars at the released
      // position, then zero them so the 450ms transform transition returns
      // the panel (the reference does the same through getDragStyles).
      void popup.offsetWidth;
      popup.style.setProperty("--drawer-swipe-movement-x", "0px");
      popup.style.setProperty("--drawer-swipe-movement-y", "0px");
      const overlay = overlayOf(dialog);
      if (overlay) overlay.style.setProperty("--drawer-swipe-progress", "0");
      finishNestedSwipe(0);
    }

    // Mouse and pen: swipes start on the panel chrome (swipe handle, bleed,
    // padding) but not inside the content wrapper or on interactive elements
    // (DrawerViewport onPointerDown: isSwipeIgnoredTarget/isDrawerContentTarget).
    // A press outside the popup is a backdrop dismiss, handled below.
    dialog.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "touch") return;
      if (event.button !== 0) return;
      const popup = popupOf(dialog);
      if (!popup || popup.hasAttribute("data-ending-style") || hasOpenNested(dialog)) return;
      const target = event.target instanceof Element ? event.target : null;
      if (!target || !popup.contains(target)) return;
      if (target.closest(IGNORE_SELECTOR) || target.closest('[data-slot="drawer-content"]')) {
        return;
      }
      startSwipe(event.clientX, event.clientY, event.timeStamp);
      state.pointerId = event.pointerId;
      try {
        dialog.setPointerCapture(event.pointerId);
      } catch {
        /* no capture, moves still bubble */
      }
    });

    dialog.addEventListener("pointermove", (event) => {
      if (event.pointerType === "touch") return;
      if (!state.swiping || state.pointerId !== event.pointerId) return;
      event.preventDefault(); // prevent text selection while dragging
      moveSwipe(event.clientX, event.clientY, event.timeStamp);
    });

    const onPointerEnd = (event) => {
      if (event.pointerType === "touch") return;
      if (state.pointerId !== event.pointerId) return;
      try {
        dialog.releasePointerCapture(event.pointerId);
      } catch {
        /* already released */
      }
      endSwipe(event.timeStamp);
    };
    dialog.addEventListener("pointerup", onPointerEnd);
    dialog.addEventListener("pointercancel", onPointerEnd);

    // Touch: swipes can start anywhere in the panel, arbitrated against
    // scrollable content (DrawerViewport onTouchStart/processTouchMove).
    dialog.addEventListener(
      "touchstart",
      (event) => {
        const popup = popupOf(dialog);
        if (!popup || popup.hasAttribute("data-ending-style") || hasOpenNested(dialog)) return;
        if (event.touches.length !== 1) {
          state.touch = null;
          return;
        }
        const touch = event.touches[0];
        const target = event.target instanceof Element ? event.target : popup;
        if (!popup.contains(target) || target.closest('input[type="range"]')) {
          state.touch = null;
          return;
        }
        const vertical = axisIsY(dialog);
        const scrollTarget = findScrollable(target, popup, vertical);
        const crossScrollable = !!findScrollable(target, popup, !vertical);
        state.touch = {
          startX: touch.clientX,
          startY: touch.clientY,
          lastX: touch.clientX,
          lastY: touch.clientY,
          scrollTarget,
          crossScrollable,
          // null: undecided, claim on a move toward dismiss from the edge.
          allowSwipe: scrollTarget
            ? atDismissEdge(scrollTarget, directionOf(dialog))
              ? null
              : false
            : null,
          yieldToScroll: false,
          attributed: false,
        };
      },
      { passive: true },
    );

    dialog.addEventListener(
      "touchmove",
      (event) => {
        const touchState = state.touch;
        if (!touchState || event.touches.length !== 1) return;
        const touch = event.touches[0];
        const vertical = axisIsY(dialog);
        const direction = directionOf(dialog);
        const snap = snapStateOf(dialog);
        const snapActive = Boolean(snap && vertical && snap.resolved.length > 0);
        const axisDelta = vertical
          ? touch.clientY - touchState.lastY
          : touch.clientX - touchState.lastX;
        touchState.lastX = touch.clientX;
        touchState.lastY = touch.clientY;

        if (touchState.yieldToScroll) return;

        // A non-cancelable move means the browser committed to a native
        // scroll (shouldYieldTouchMove).
        if (!event.cancelable && !state.swiping) {
          touchState.yieldToScroll = true;
          return;
        }

        // Axis arbitration against cross-axis scrollable content: yield once
        // the cross axis wins the slop race, claim once the drawer axis does.
        if (!touchState.attributed && touchState.allowSwipe !== true && touchState.crossScrollable) {
          const dAxis = vertical
            ? touch.clientY - touchState.startY
            : touch.clientX - touchState.startX;
          const dCross = vertical
            ? touch.clientX - touchState.startX
            : touch.clientY - touchState.startY;
          if (
            Math.abs(dCross) >= AXIS_LOCK_SLOP &&
            Math.abs(dCross) > Math.abs(dAxis) + AXIS_LOCK_BIAS
          ) {
            touchState.yieldToScroll = true;
            return;
          }
          if (Math.abs(dAxis) >= AXIS_LOCK_SLOP) touchState.attributed = true;
          else return; // unattributed: leave the event to the browser
        }

        if (touchState.scrollTarget) {
          // Scrolling content owns the gesture until the scroller sits at the
          // dismiss edge and the finger moves toward dismiss; then the drawer
          // claims it (canSwipeFromScrollEdgeOnMove). With snap points, any
          // vertical move from the edge may snap, so both directions claim.
          if (touchState.allowSwipe !== true && axisDelta !== 0) {
            touchState.allowSwipe =
              event.cancelable &&
              (snapActive || movingTowardDismiss(direction, axisDelta)) &&
              atDismissEdge(touchState.scrollTarget, direction);
          }
          if (touchState.allowSwipe !== true) return;
        }

        if (event.cancelable) event.preventDefault();
        event.stopPropagation();

        if (!state.swiping) {
          // Absorb the press-to-first-move gap so the panel doesn't jump
          // (useSwipeDismiss isFirstPointerMoveRef note).
          startSwipe(touch.clientX, touch.clientY, event.timeStamp);
        }
        moveSwipe(touch.clientX, touch.clientY, event.timeStamp);
      },
      { passive: false },
    );

    const onTouchEnd = (event) => {
      state.touch = null;
      endSwipe(event.timeStamp);
    };
    dialog.addEventListener("touchend", onTouchEnd);
    dialog.addEventListener("touchcancel", onTouchEnd);
  }

  // ----- lifecycle -----------------------------------------------------------

  function ensureDrawer(dialog) {
    if (!dialog || dialog.dataset.tuiDrawerInitialized === "true") return dialog;
    dialog.dataset.tuiDrawerInitialized = "true";
    listenForEscape(dialog);

    dialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      requestOpenChange(dialog, false);
    });

    dialog.addEventListener("close", () => {
      window.clearTimeout(dialog._tuiCloseTimer);
      delete dialog._tuiCloseTimer;
      cleanupClosed(dialog);
    });

    // A press anywhere outside the popup (on the viewport or the overlay) is
    // an outside press and dismisses the drawer (Base UI outside press). For
    // non-modal drawers the viewport is pointer-events-none, so outside
    // presses reach the page instead — same as before.
    dialog.addEventListener("pointerdown", (event) => {
      if (!dialog.open) return;
      if (dialog.hasAttribute("data-tui-drawer-disable-dismissible")) return;
      const popup = popupOf(dialog);
      const target = event.target instanceof Element ? event.target : null;
      if (popup && target && !popup.contains(target)) requestOpenChange(dialog, false);
    });

    attachSwipe(dialog);

    return dialog;
  }

  // Moves the drawer to <body>, the pendant of the reference's DrawerPortal.
  function portal(dialog) {
    if (dialog.parentElement !== document.body) {
      if (!dialog._tuiPortalOwner) dialog._tuiPortalOwner = dialog.parentElement;
      document.body.appendChild(dialog);
    }
  }

  function init(root = document) {
    root.querySelectorAll("[data-tui-drawer-trigger]").forEach(listenForEscape);
    // Self-healing modality: recompute the inert siblings on every DOM
    // change, so a swap or a missed close event never leaves stale inert.
    syncInert();
    // The unmount half of the React portal pendant: a drawer lives as long
    // as its SSR declaration site (_tuiPortalOwner) stays in the document.
    // Ownership keeps programmatic drawers (window.tui.drawer.open) alive
    // and judges swaps without mid-swap trigger heuristics.
    document.querySelectorAll("body > dialog[data-tui-drawer-content]").forEach((dialog) => {
      if (dialog._tuiPortalOwner && !dialog._tuiPortalOwner.isConnected) {
        unwatchSnapResize(dialog);
        dialog._tuiReleaseScroll?.();
        dialog._tuiReleaseScroll = null;
        dialog.remove();
      }
    });
    root.querySelectorAll("dialog[data-tui-drawer-content]").forEach((dialog) => {
      if (dialog.dataset.tuiDrawerInitialized === "true") return;
      ensureDrawer(dialog);

      if (dialog.getAttribute("data-tui-drawer-initial-open") === "true") {
        // One-shot: consume the attribute so a later re-init never re-opens
        // a closed drawer.
        dialog.removeAttribute("data-tui-drawer-initial-open");
        openDrawer(dialog);
      } else {
        updateState(dialog, dialog.open);
      }
    });
    syncStack();
  }

  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;
    const trigger = event.target.closest("[data-tui-drawer-trigger]");
    if (trigger) {
      toggleDrawer(drawerFor(trigger));
      return;
    }
    const closeButton = event.target.closest("[data-tui-drawer-close]");
    if (closeButton) {
      requestOpenChange(drawerFor(closeButton), false);
    }
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => init());
  } else {
    init();
  }

  // Initialize drawers added later (e.g. swapped in via htmx), so a
  // server-rendered drawer with Open true still opens. Also
  // release the scroll lock if an open drawer got swapped out of the DOM.
  new MutationObserver(() => {
    init();
  }).observe(document.body, {
    childList: true,
    subtree: true,
  });

  window.tui = window.tui || {};
  window.tui.drawer = {
    open: openDrawer,
    close: closeDrawer,
    toggle: toggleDrawer,
    isOpen: isDrawerOpen,
    setSnapPoint: setSnapPoint,
    getSnapPoint: getSnapPoint,
  };
})();

// components/dropdownmenu/dropdownmenu.js
// Uses window.FloatingUIDOM from components/floatingui (loaded in the same bundle).
(function () {
  const EXIT_MS = 120; // exit animation (duration-100) + slack
  const COLLISION_PADDING = 5;
  // Submenu hover intent, like Base UI: open fast, close with a grace delay so
  // moving the mouse diagonally into the submenu does not flicker.
  const SUB_OPEN_DELAY = 100;
  const SUB_CLOSE_DELAY = 300;

  const escapeTargets = new WeakSet();
  function listenForEscape(element) {
    if (!element || escapeTargets.has(element)) return;
    element.addEventListener("keydown", closeOnEscapeKeyDown);
    escapeTargets.add(element);
  }

  // useDismiss: popup/reference listeners stop Escape before outer document handlers.
  function closeOnEscapeKeyDown(event) {
    if (event.key !== "Escape") return;
    const contents = event.currentTarget === document
      ? allContents()
      : [event.currentTarget.hasAttribute("data-tui-dropdownmenu-content")
        ? event.currentTarget
        : contentFor(event.currentTarget)];
    let handled = false;
    for (const content of contents) {
      if (!content?.hasAttribute("data-open")) continue;
      if (requestOpenChange(content, false, false, true)) event.preventDefault();
      event.stopPropagation();
      handled = true;
    }
    return handled;
  }

  function allContents() {
    return document.querySelectorAll("[data-tui-dropdownmenu-content]");
  }

  function triggerFor(content) {
    return document.querySelector(
      '[data-tui-dropdownmenu-trigger][aria-controls="' + content.id + '"]',
    );
  }

  function contentFor(trigger) {
    return document.getElementById(trigger.getAttribute("aria-controls"));
  }

  function popupFor(content) {
    return content.querySelector("[data-tui-dropdownmenu-popup]");
  }

  function setState(content, state) {
    const open = state === "open";
    content.toggleAttribute("data-open", open);
    content.toggleAttribute("data-closed", !open);
    const popup = popupFor(content);
    if (popup) {
      popup.toggleAttribute("data-open", open);
      popup.toggleAttribute("data-closed", !open);
    }
  }

  function isOpen(el) {
    return !!el && el.hasAttribute("data-open");
  }

  function setTransitionAttribute(content, name, present) {
    content.toggleAttribute(name, present);
    const popup = popupFor(content);
    if (popup) popup.toggleAttribute(name, present);
  }

  function startTransition(content) {
    setTransitionAttribute(content, "data-ending-style", false);
    setTransitionAttribute(content, "data-starting-style", true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setTransitionAttribute(content, "data-starting-style", false));
    });
  }

  function setChecked(item, checked) {
    item.toggleAttribute("data-checked", checked);
    item.toggleAttribute("data-unchecked", !checked);
    item.setAttribute("aria-checked", checked ? "true" : "false");
  }

  function setSide(content, side) {
    content.setAttribute("data-side", side);
    const popup = popupFor(content);
    if (popup) popup.setAttribute("data-side", side);
  }

  // Base UI zooms the popup out of the anchor's center point (e.g.
  // "96px -4px"), not out of a placement corner.
  function anchorOrigin(result, anchorRect, positionerRect, sideOffset) {
    const side = result.placement.split("-")[0];
    const centerX = anchorRect.left + anchorRect.width / 2 - positionerRect.left + "px";
    const centerY = anchorRect.top + anchorRect.height / 2 - positionerRect.top + "px";
    if (side === "bottom") return centerX + " " + -sideOffset + "px";
    if (side === "top") return centerX + " calc(100% + " + sideOffset + "px)";
    if (side === "right") return -sideOffset + "px " + centerY;
    return "calc(100% + " + sideOffset + "px) " + centerY;
  }

  // Moves the content to <body> (shadcn portals it the same way).
  // The unmount half of the React portal pendant: a portaled content lives
  // as long as its SSR declaration site (_tuiPortalOwner) stays in the
  // document. Trigger-presence heuristics judged mid-swap moments wrongly -
  // multi-phase swap layers briefly disconnect the new triggers.
  function removeOrphanedContents(content) {
    document.querySelectorAll("body > [data-tui-dropdownmenu-content]").forEach((c) => {
      if (c !== content && c._tuiPortalOwner && !c._tuiPortalOwner.isConnected) {
        stopAutoPositioning(c);
        c._tuiReleaseScroll?.();
        c._tuiReleaseScroll = null;
        c.remove();
      }
    });
  }

  function portal(content) {
    listenForEscape(content);
    removeOrphanedContents(content);
    if (content.parentElement !== document.body) {
      if (!content._tuiPortalOwner) content._tuiPortalOwner = content.parentElement;
      document.body.appendChild(content);
    }
  }

  function positionMenu(content, trigger) {
    const { computePosition, offset, flip, shift, size } = window.FloatingUIDOM;
    const mobile = window.matchMedia("(max-width: 767px)").matches;
    const side =
      (mobile && content.getAttribute("data-tui-dropdownmenu-mobile-side")) ||
      content.getAttribute("data-tui-dropdownmenu-side") ||
      "bottom";
    const align =
      (mobile && content.getAttribute("data-tui-dropdownmenu-mobile-align")) ||
      content.getAttribute("data-tui-dropdownmenu-align") ||
      "start";
    const sideOffset =
      parseInt(content.getAttribute("data-tui-dropdownmenu-side-offset"), 10) || 4;
    const alignOffset =
      parseInt(content.getAttribute("data-tui-dropdownmenu-align-offset"), 10) || 0;
    const placement = align === "center" ? side : side + "-" + align;

    return computePosition(trigger, content, {
      placement: placement,
      strategy: "absolute",
      middleware: [
        offset({ mainAxis: sideOffset, alignmentAxis: alignOffset }),
        flip({ padding: COLLISION_PADDING }),
        shift({ padding: COLLISION_PADDING }),
        size({
          padding: COLLISION_PADDING,
          apply(args) {
            content.style.setProperty(
              "--available-height",
              args.availableHeight + "px",
            );
            content.style.setProperty(
              "--anchor-width",
              args.rects.reference.width + "px",
            );
          },
        }),
      ],
    }).then((result) => {
      content.style.left = result.x + "px";
      content.style.top = result.y + "px";
      setSide(content, result.placement.split("-")[0]);
      const popup = popupFor(content);
      if (popup) {
        popup.style.setProperty(
          "--transform-origin",
          anchorOrigin(
            result,
            trigger.getBoundingClientRect(),
            content.getBoundingClientRect(),
            sideOffset,
          ),
        );
      }
    });
  }

  // Base UI keeps mounted popups attached to their anchors while ancestors
  // move, resize, scroll, or shift layout. This also tracks a mobile sidebar
  // while its opening transform is still settling.
  function startAutoPositioning(content, trigger) {
    if (content._tuiPositionCleanup) content._tuiPositionCleanup();
    let resolveFirst;
    const firstPosition = new Promise((resolve) => {
      resolveFirst = resolve;
    });
    const update = () => positionMenu(content, trigger).then(resolveFirst, resolveFirst);
    content._tuiPositionCleanup = window.FloatingUIDOM.autoUpdate(trigger, content, update, {
      elementResize: typeof ResizeObserver !== "undefined",
      layoutShift: typeof IntersectionObserver !== "undefined",
    });
    return firstPosition;
  }

  function stopAutoPositioning(content) {
    if (!content._tuiPositionCleanup) return;
    content._tuiPositionCleanup();
    content._tuiPositionCleanup = null;
  }

  // ----- focus highlighting (Base UI moves real focus to menu items) --------

  const ITEM_SELECTOR = '[role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"]';

  // The menu container the keyboard navigates in: the deepest open submenu
  // holding focus, otherwise the root popup.
  function containerOf(el) {
    return el.closest("[data-tui-dropdownmenu-sub-content], [data-tui-dropdownmenu-popup]");
  }

  function itemsIn(container) {
    return [...container.querySelectorAll(ITEM_SELECTOR)].filter(
      (item) =>
        containerOf(item) === container &&
        !item.disabled &&
        item.getAttribute("aria-disabled") !== "true",
    );
  }

  // Focus waits until after the input task:
  // Chromium's mousedown default focuses the trigger, WebKit's clears focus.
  // One frame, like Base UI, with a guard for a popup that closed meanwhile.
  function enqueueFocus(el, shouldFocus) {
    if (!el) return;
    requestAnimationFrame(() => {
      if (shouldFocus && !shouldFocus()) return;
      el.focus({ preventScroll: true });
    });
  }

  function focusItem(item) {
    if (item && document.activeElement !== item) item.focus({ preventScroll: false });
  }

  // Wraps at both ends, the pendant of Menu.Root's loopFocus, which the
  // reference defaults to true: ArrowDown on the last item returns to the
  // first and ArrowUp on the first goes to the last. Disabled items stay out
  // of the walk — itemsIn filters them, because ours are natively disabled
  // buttons rather than the aria-disabled ones the reference keeps focusable.
  function moveFocus(container, delta) {
    const items = itemsIn(container);
    if (!items.length) return;
    const index = items.indexOf(document.activeElement);
    if (index === -1) {
      focusItem(delta > 0 ? items[0] : items[items.length - 1]);
      return;
    }
    focusItem(items[(index + delta + items.length) % items.length]);
  }

  // ----- open / close --------------------------------------------------------

  // focusOn: "first" or "last" lands focus on that item once the menu is in
  // place, anything falsy focuses the popup. `true` still means "first".
  function open(content, trigger, focusOn) {
    allContents().forEach((c) => {
      if (c !== content) close(c);
    });
    clearTimeout(content._tuiHide);
    content._tuiOpenMethod = trigger._tuiOpenMethod || "programmatic";
    portal(content);
    // z-index portal like shadcn (no native top layer); re-append
    // keeps paint order = open order.
    document.body.appendChild(content);
    content.hidden = false;

    // Position it invisibly first, then play the enter animation in place.
    content.style.visibility = "hidden";
    const finish = () => {
      // duration-100 transitions `all`; a visibility transition would
      // freeze at hidden in background tabs - flip suppressed.
      const popup = popupFor(content);
      content.style.transitionProperty = "none";
      if (popup) popup.style.transitionProperty = "none";
      content.style.visibility = "";
      void content.offsetWidth;
      content.style.transitionProperty = "";
      if (popup) popup.style.transitionProperty = "";
      if (content.hidden || !content.isConnected) return;
      // useAnchoredPopupScrollLock measures the positioned popup for touch opens.
      content._tuiReleaseScroll?.();
      content._tuiReleaseScroll = window.tui.scrollLock.anchoredPopup(
        true, content._tuiOpenMethod === "touch", content, trigger,
      );
      setState(content, "open");
      startTransition(content);
      trigger.setAttribute("aria-expanded", "true");
      trigger.setAttribute("data-popup-open", "");
      trigger.setAttribute("data-pressed", "");
      if (!popup) return;
      syncSubState(popup);
      // The guard is the same one the reference uses: do not pull focus back
      // into a popup that closed while the frame was queued.
      const stillOpen = () => isOpen(content);
      if (focusOn) {
        const items = itemsIn(popup);
        enqueueFocus((focusOn === "last" ? items[items.length - 1] : items[0]) || popup, stillOpen);
      } else {
        enqueueFocus(popup, stillOpen);
      }
    };
    startAutoPositioning(content, trigger).then(finish, finish);
  }

  function close(content, refocusTrigger) {
    if (content.hidden) return;
    stopAutoPositioning(content);
    setTransitionAttribute(content, "data-starting-style", false);
    setState(content, "closed");
    setTransitionAttribute(content, "data-ending-style", true);
    content.querySelectorAll("[data-tui-dropdownmenu-sub]").forEach(closeSubNow);
    const trigger = triggerFor(content);
    if (trigger) {
      trigger.setAttribute("aria-expanded", "false");
      trigger.removeAttribute("data-popup-open");
      trigger.removeAttribute("data-pressed");
      if (refocusTrigger) trigger.focus({ preventScroll: true });
    }
    clearTimeout(content._tuiHide);
    content._tuiHide = setTimeout(() => {
      if (content.hasAttribute("data-closed") && !content.hidden) {
        content.hidden = true;
        setTransitionAttribute(content, "data-ending-style", false);
      }
    }, EXIT_MS);
    content._tuiReleaseScroll?.();
    content._tuiReleaseScroll = null;
  }

  function closeAll(refocusTrigger) {
    allContents().forEach((content) => close(content, refocusTrigger));
  }

  function requestOpenChange(content, nextOpen, focusOn, refocusTrigger) {
    if (!content || isOpen(content) === nextOpen) return false;
    const accepted = content.dispatchEvent(
      new CustomEvent("dropdownmenu-open-change", {
        bubbles: true,
        cancelable: true,
        detail: { open: nextOpen },
      }),
    );
    if (!accepted || content.hasAttribute("data-tui-dropdownmenu-controlled")) return false;
    const trigger = triggerFor(content);
    if (nextOpen && trigger) open(content, trigger, focusOn);
    else if (!nextOpen) close(content, refocusTrigger);
    return true;
  }

  function requestCloseAll(refocusTrigger) {
    allContents().forEach((content) =>
      requestOpenChange(content, false, false, refocusTrigger),
    );
  }

  function anyOpen() {
    return [...allContents()].find(isOpen) || null;
  }

  // ----- submenus -------------------------------------------------------------

  function subParts(sub) {
    return {
      trigger: sub.querySelector("[data-tui-dropdownmenu-sub-trigger]"),
      content: sub.querySelector("[data-tui-dropdownmenu-sub-content]"),
    };
  }

  function openSub(sub, focusFirst) {
    const { trigger, content } = subParts(sub);
    if (!trigger || !content) return;
    content.classList.remove("hidden");
    content.style.visibility = "hidden";

    const { computePosition, offset, flip, shift } = window.FloatingUIDOM;
    // Base UI submenu placement: right-start, sideOffset 0, alignOffset -3.
    computePosition(trigger, content, {
      placement: "right-start",
      strategy: "fixed",
      middleware: [
        offset({ mainAxis: 0, alignmentAxis: -3 }),
        flip({ padding: COLLISION_PADDING }),
        shift({ padding: COLLISION_PADDING }),
      ],
    }).then((result) => {
      if (content.classList.contains("hidden")) return; // closed meanwhile
      content.style.transition = "none";
      content.style.left = result.x + "px";
      content.style.top = result.y + "px";
      content.setAttribute("data-side", result.placement.split("-")[0]);
      content.style.setProperty(
        "--transform-origin",
        anchorOrigin(result, trigger.getBoundingClientRect(), content.getBoundingClientRect(), 0),
      );
      content.offsetHeight; // flush styles before re-enabling transitions
      content.style.transition = "";
      // duration-100 transitions `all`; a visibility transition would
      // freeze at hidden in background tabs - flip suppressed.
      content.style.transitionProperty = "none";
      content.style.visibility = "";
      void content.offsetWidth;
      content.style.transitionProperty = "";
      content.setAttribute("data-open", "");
      content.removeAttribute("data-closed");
      startTransition(content);
      trigger.setAttribute("data-popup-open", "");
	  trigger.setAttribute("aria-expanded", "true");
      if (focusFirst) focusItem(itemsIn(content)[0] || content);
    });
  }

  // Closes with the exit animation.
  function closeSub(sub) {
    const { trigger, content } = subParts(sub);
    if (!trigger || !content) return;
    content.removeAttribute("data-open");
    content.setAttribute("data-closed", "");
    setTransitionAttribute(content, "data-starting-style", false);
    setTransitionAttribute(content, "data-ending-style", true);
    trigger.removeAttribute("data-popup-open");
	trigger.setAttribute("aria-expanded", "false");
    setTimeout(() => {
      if (content.hasAttribute("data-closed")) {
        content.classList.add("hidden");
        setTransitionAttribute(content, "data-ending-style", false);
      }
    }, EXIT_MS);
  }

  // Closes immediately (used when the whole menu goes away).
  function closeSubNow(sub) {
    clearTimeout(sub._tuiOpen);
    clearTimeout(sub._tuiClose);
    sub._tuiOpen = null;
    sub._tuiClose = null;
    const { trigger, content } = subParts(sub);
    if (!trigger || !content) return;
    content.classList.add("hidden");
    content.removeAttribute("data-open");
    content.setAttribute("data-closed", "");
    setTransitionAttribute(content, "data-starting-style", false);
    setTransitionAttribute(content, "data-ending-style", false);
    trigger.removeAttribute("data-popup-open");
	trigger.setAttribute("aria-expanded", "false");
  }

  function requestSubOpenChange(sub, nextOpen, focusFirst) {
	const { trigger, content } = subParts(sub);
	if (!trigger || !content || content.hasAttribute("data-open") === nextOpen) return;
	const accepted = trigger.dispatchEvent(
	  new CustomEvent("dropdownmenu-sub-open-change", {
		bubbles: true,
		cancelable: true,
		detail: { open: nextOpen },
	  }),
	);
	if (!accepted || sub.hasAttribute("data-tui-dropdownmenu-sub-controlled")) return;
	sub.setAttribute("data-tui-dropdownmenu-sub-open", String(nextOpen));
	if (nextOpen) openSub(sub, focusFirst);
	else closeSub(sub);
  }

  function syncSubState(menu) {
	menu.querySelectorAll("[data-tui-dropdownmenu-sub]").forEach((sub) => {
	  const { content } = subParts(sub);
	  if (!content) return;
	  const shouldOpen = sub.getAttribute("data-tui-dropdownmenu-sub-open") === "true";
	  if (shouldOpen && !content.hasAttribute("data-open")) openSub(sub, false);
	  else if (!shouldOpen && content.hasAttribute("data-open")) closeSubNow(sub);
	});
  }

  // Hover intent: while the pointer is over a sub (trigger or its content),
  // keep it open; everything else in the menu schedules its subs to close.
  document.addEventListener("mouseover", (e) => {
    if (!(e.target instanceof Element)) return;
    const menu = e.target.closest("[data-tui-dropdownmenu-content]");
    if (!menu) return;
    const hovered = e.target.closest("[data-tui-dropdownmenu-sub]");

    menu.querySelectorAll("[data-tui-dropdownmenu-sub]").forEach((sub) => {
      const { content } = subParts(sub);
      if (!content) return;
      const isOpen = content.hasAttribute("data-open");
      const onPath = hovered && (sub === hovered || sub.contains(hovered));

      if (onPath) {
        clearTimeout(sub._tuiClose);
        sub._tuiClose = null;
        if (!isOpen && !sub._tuiOpen) {
          sub._tuiOpen = setTimeout(() => {
            sub._tuiOpen = null;
			requestSubOpenChange(sub, true);
          }, SUB_OPEN_DELAY);
        }
      } else {
        clearTimeout(sub._tuiOpen);
        sub._tuiOpen = null;
        if (isOpen && !sub._tuiClose) {
          sub._tuiClose = setTimeout(() => {
            sub._tuiClose = null;
			requestSubOpenChange(sub, false);
          }, SUB_CLOSE_DELAY);
        }
      }
    });
  });

  // The highlight follows the pointer: focus the item under it, fall back to
  // the menu container when the pointer sits on empty menu space.
  document.addEventListener("pointermove", (e) => {
    if (!(e.target instanceof Element)) return;
    const content = e.target.closest("[data-tui-dropdownmenu-content]");
    if (!isOpen(content)) return;
    const item = e.target.closest(ITEM_SELECTOR);
    if (item && containerOf(item)) {
      focusItem(item);
    } else {
      const container = containerOf(e.target) || popupFor(content);
      if (container && !container.contains(document.activeElement)) return;
      if (container && document.activeElement !== container) {
        container.focus({ preventScroll: true });
      }
    }
  });

  // ----- init (portal on open) --------------------

  function init() {
    document.querySelectorAll("[data-tui-dropdownmenu-trigger]").forEach(listenForEscape);
    removeOrphanedContents();
    document.querySelectorAll("[data-tui-dropdownmenu-trigger]").forEach((trigger) => {
      const content = contentFor(trigger);
      if (!content) return;
      if (content.getAttribute("data-tui-dropdownmenu-initial-open") === "true") {
        content.removeAttribute("data-tui-dropdownmenu-initial-open");
        open(content, trigger, false);
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
  // Re-init on any childList mutation, directly (never rAF-deferred: rAF
  // does not fire in hidden tabs or throttled iframes): swapped-in markup
  // wires itself, removals release portaled content through the
  // ownership sweep.
  new MutationObserver(() => init()).observe(document.body, { childList: true, subtree: true });

  // ----- events ---------------------------------------------------------------

  // Pointer interactions toggle and dismiss on PRESS, exactly like Base UI.
  // Click is never used for open/close, so the stray click the browser fires
  // on <body> after the menu opened over the trigger is naturally harmless.
  function toggle(trigger, focusOn) {
    const content = contentFor(trigger);
    if (!content) return;
    requestOpenChange(content, !isOpen(content), focusOn);
  }

  // The menu-button pattern: ArrowDown opens on the first item, ArrowUp on
  // the last. Only the arrows are taken here — Enter and Space arrive as the
  // detail-0 click a native button synthesises and are handled there, the way
  // useClick and useListNavigation split it in the reference.
  const OPEN_KEYS = { ArrowDown: "first", ArrowUp: "last" };
  document.addEventListener("keydown", (e) => {
    if (!(e.target instanceof Element)) return;
    const focusOn = OPEN_KEYS[e.key];
    if (!focusOn) return;
    const trigger = e.target.closest("[data-tui-dropdownmenu-trigger]");
    if (!trigger || trigger.disabled) return;
    const content = contentFor(trigger);
    // Already open: leave it to the handlers that navigate and close.
    if (!content || isOpen(content)) return;
    e.preventDefault(); // the arrows would otherwise scroll the page
    // Opening consumes the key. Without this the navigation handler below
    // sees the menu already open in the same dispatch and walks the highlight
    // a second time, so ArrowDown would land on the second item.
    e.stopImmediatePropagation();
    // Through requestOpenChange, not open, so a controlled menu still gets to
    // veto the open and the change event still fires.
    trigger._tuiOpenMethod = "keyboard";
    requestOpenChange(content, true, focusOn);
  });

  document.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 || !(e.target instanceof Element)) return;
    const trigger = e.target.closest("[data-tui-dropdownmenu-trigger]");
    if (trigger) {
      trigger._tuiOpenMethod = e.pointerType;
      if (!trigger.disabled) toggle(trigger, false);
      return;
    }
    if (!e.target.closest("[data-tui-dropdownmenu-content]")) requestCloseAll(false);
  });

  document.addEventListener("click", (e) => {
    if (!(e.target instanceof Element)) return;
    const trigger = e.target.closest("[data-tui-dropdownmenu-trigger]");
    if (trigger) {
      // Keyboard activation only (Enter/Space fire a detail-0 click without
      // a preceding pointerdown); pointer presses are handled on pointerdown.
      if (e.detail === 0 && !trigger.disabled) {
        trigger._tuiOpenMethod = "keyboard";
        toggle(trigger, true);
      }
      return;
    }

    // Clicking a submenu trigger opens it right away.
    const subTrigger = e.target.closest("[data-tui-dropdownmenu-sub-trigger]");
    if (subTrigger) {
      const sub = subTrigger.closest("[data-tui-dropdownmenu-sub]");
      if (sub) {
        clearTimeout(sub._tuiOpen);
        sub._tuiOpen = null;
		requestSubOpenChange(sub, true, e.detail === 0);
      }
      return;
    }

    // Checkbox items toggle and keep the menu open.
    const checkbox = e.target.closest("[data-tui-dropdownmenu-checkbox-item]");
    if (checkbox) {
      if (!checkbox.disabled) {
        const on = checkbox.hasAttribute("data-checked");
    const change = new CustomEvent("dropdownmenu-checked-change", {
      bubbles: true,
      cancelable: true,
      detail: { checked: !on },
    });
    const accepted = checkbox.dispatchEvent(change);
    if (accepted && !checkbox.hasAttribute("data-tui-dropdownmenu-checkbox-controlled")) {
      setChecked(checkbox, !on);
    }
      }
      return;
    }

    // Radio items select within their group and keep the menu open.
    const radio = e.target.closest("[data-tui-dropdownmenu-radio-item]");
    if (radio) {
      if (!radio.disabled) {
        const group = radio.closest("[data-tui-dropdownmenu-radio-group]");
    const change = new CustomEvent("dropdownmenu-value-change", {
      bubbles: true,
      cancelable: true,
      detail: { value: radio.getAttribute("data-tui-dropdownmenu-radio-value") },
    });
    const accepted = (group || radio).dispatchEvent(change);
    if (accepted && group && !group.hasAttribute("data-tui-dropdownmenu-radio-controlled")) {
          group.querySelectorAll("[data-tui-dropdownmenu-radio-item]").forEach((r) => {
            setChecked(r, false);
          });
      setChecked(radio, true);
        }
      }
      return;
    }

    const item = e.target.closest("[data-tui-dropdownmenu-item]");
    if (item) {
      if (
        item.getAttribute("aria-disabled") !== "true" &&
        item.getAttribute("data-tui-dropdownmenu-disable-close-on-click") !== "true"
      ) {
        const content = item.closest("[data-tui-dropdownmenu-content]");
        if (content) requestOpenChange(content, false, false, true);
      }
      return;
    }
  });

  document.addEventListener("keydown", (e) => {
    if (closeOnEscapeKeyDown(e)) return;
    const content = anyOpen();
    if (!content) return;

    if (e.key === "Tab") {
      requestCloseAll(false);
      return;
    }

    const active = document.activeElement;
    if (!content.contains(active)) return;
    const container = containerOf(active) || popupFor(content);
    if (!container) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        moveFocus(container, 1);
        break;
      case "ArrowUp":
        e.preventDefault();
        moveFocus(container, -1);
        break;
      case "Home": {
        e.preventDefault();
        const items = itemsIn(container);
        focusItem(items[0]);
        break;
      }
      case "End": {
        e.preventDefault();
        const items = itemsIn(container);
        focusItem(items[items.length - 1]);
        break;
      }
      case "ArrowRight": {
        const subTrigger = active.closest("[data-tui-dropdownmenu-sub-trigger]");
        if (subTrigger) {
          e.preventDefault();
          const sub = subTrigger.closest("[data-tui-dropdownmenu-sub]");
		  if (sub) requestSubOpenChange(sub, true, true);
        }
        break;
      }
      case "ArrowLeft": {
        const subContent = active.closest("[data-tui-dropdownmenu-sub-content]");
        if (subContent) {
          e.preventDefault();
          const sub = subContent.closest("[data-tui-dropdownmenu-sub]");
          if (sub) {
            const { trigger } = subParts(sub);
			requestSubOpenChange(sub, false);
            if (trigger) trigger.focus({ preventScroll: true });
          }
        }
        break;
      }
    }
  });

})();

// components/floatingui/floating_ui_core.js
// https://cdn.jsdelivr.net/npm/@floating-ui/core@1.7.0
!(function (t, e) {
  "object" == typeof exports && "undefined" != typeof module
    ? e(exports)
    : "function" == typeof define && define.amd
    ? define(["exports"], e)
    : e(
        ((t =
          "undefined" != typeof globalThis
            ? globalThis
            : t || self).FloatingUICore = {})
      );
})(this, function (t) {
  "use strict";
  const e = ["top", "right", "bottom", "left"],
    n = ["start", "end"],
    i = e.reduce((t, e) => t.concat(e, e + "-" + n[0], e + "-" + n[1]), []),
    o = Math.min,
    r = Math.max,
    a = { left: "right", right: "left", bottom: "top", top: "bottom" },
    l = { start: "end", end: "start" };
  function s(t, e, n) {
    return r(t, o(e, n));
  }
  function f(t, e) {
    return "function" == typeof t ? t(e) : t;
  }
  function c(t) {
    return t.split("-")[0];
  }
  function u(t) {
    return t.split("-")[1];
  }
  function m(t) {
    return "x" === t ? "y" : "x";
  }
  function d(t) {
    return "y" === t ? "height" : "width";
  }
  function g(t) {
    return ["top", "bottom"].includes(c(t)) ? "y" : "x";
  }
  function p(t) {
    return m(g(t));
  }
  function h(t, e, n) {
    void 0 === n && (n = !1);
    const i = u(t),
      o = p(t),
      r = d(o);
    let a =
      "x" === o
        ? i === (n ? "end" : "start")
          ? "right"
          : "left"
        : "start" === i
        ? "bottom"
        : "top";
    return e.reference[r] > e.floating[r] && (a = w(a)), [a, w(a)];
  }
  function y(t) {
    return t.replace(/start|end/g, (t) => l[t]);
  }
  function w(t) {
    return t.replace(/left|right|bottom|top/g, (t) => a[t]);
  }
  function x(t) {
    return "number" != typeof t
      ? (function (t) {
          return { top: 0, right: 0, bottom: 0, left: 0, ...t };
        })(t)
      : { top: t, right: t, bottom: t, left: t };
  }
  function v(t) {
    const { x: e, y: n, width: i, height: o } = t;
    return {
      width: i,
      height: o,
      top: n,
      left: e,
      right: e + i,
      bottom: n + o,
      x: e,
      y: n,
    };
  }
  function b(t, e, n) {
    let { reference: i, floating: o } = t;
    const r = g(e),
      a = p(e),
      l = d(a),
      s = c(e),
      f = "y" === r,
      m = i.x + i.width / 2 - o.width / 2,
      h = i.y + i.height / 2 - o.height / 2,
      y = i[l] / 2 - o[l] / 2;
    let w;
    switch (s) {
      case "top":
        w = { x: m, y: i.y - o.height };
        break;
      case "bottom":
        w = { x: m, y: i.y + i.height };
        break;
      case "right":
        w = { x: i.x + i.width, y: h };
        break;
      case "left":
        w = { x: i.x - o.width, y: h };
        break;
      default:
        w = { x: i.x, y: i.y };
    }
    switch (u(e)) {
      case "start":
        w[a] -= y * (n && f ? -1 : 1);
        break;
      case "end":
        w[a] += y * (n && f ? -1 : 1);
    }
    return w;
  }
  async function A(t, e) {
    var n;
    void 0 === e && (e = {});
    const { x: i, y: o, platform: r, rects: a, elements: l, strategy: s } = t,
      {
        boundary: c = "clippingAncestors",
        rootBoundary: u = "viewport",
        elementContext: m = "floating",
        altBoundary: d = !1,
        padding: g = 0,
      } = f(e, t),
      p = x(g),
      h = l[d ? ("floating" === m ? "reference" : "floating") : m],
      y = v(
        await r.getClippingRect({
          element:
            null ==
              (n = await (null == r.isElement ? void 0 : r.isElement(h))) || n
              ? h
              : h.contextElement ||
                (await (null == r.getDocumentElement
                  ? void 0
                  : r.getDocumentElement(l.floating))),
          boundary: c,
          rootBoundary: u,
          strategy: s,
        })
      ),
      w =
        "floating" === m
          ? { x: i, y: o, width: a.floating.width, height: a.floating.height }
          : a.reference,
      b = await (null == r.getOffsetParent
        ? void 0
        : r.getOffsetParent(l.floating)),
      A = ((await (null == r.isElement ? void 0 : r.isElement(b))) &&
        (await (null == r.getScale ? void 0 : r.getScale(b)))) || {
        x: 1,
        y: 1,
      },
      R = v(
        r.convertOffsetParentRelativeRectToViewportRelativeRect
          ? await r.convertOffsetParentRelativeRectToViewportRelativeRect({
              elements: l,
              rect: w,
              offsetParent: b,
              strategy: s,
            })
          : w
      );
    return {
      top: (y.top - R.top + p.top) / A.y,
      bottom: (R.bottom - y.bottom + p.bottom) / A.y,
      left: (y.left - R.left + p.left) / A.x,
      right: (R.right - y.right + p.right) / A.x,
    };
  }
  function R(t, e) {
    return {
      top: t.top - e.height,
      right: t.right - e.width,
      bottom: t.bottom - e.height,
      left: t.left - e.width,
    };
  }
  function P(t) {
    return e.some((e) => t[e] >= 0);
  }
  function D(t) {
    const e = o(...t.map((t) => t.left)),
      n = o(...t.map((t) => t.top));
    return {
      x: e,
      y: n,
      width: r(...t.map((t) => t.right)) - e,
      height: r(...t.map((t) => t.bottom)) - n,
    };
  }
  (t.arrow = (t) => ({
    name: "arrow",
    options: t,
    async fn(e) {
      const {
          x: n,
          y: i,
          placement: r,
          rects: a,
          platform: l,
          elements: c,
          middlewareData: m,
        } = e,
        { element: g, padding: h = 0 } = f(t, e) || {};
      if (null == g) return {};
      const y = x(h),
        w = { x: n, y: i },
        v = p(r),
        b = d(v),
        A = await l.getDimensions(g),
        R = "y" === v,
        P = R ? "top" : "left",
        D = R ? "bottom" : "right",
        T = R ? "clientHeight" : "clientWidth",
        O = a.reference[b] + a.reference[v] - w[v] - a.floating[b],
        E = w[v] - a.reference[v],
        L = await (null == l.getOffsetParent ? void 0 : l.getOffsetParent(g));
      let k = L ? L[T] : 0;
      (k && (await (null == l.isElement ? void 0 : l.isElement(L)))) ||
        (k = c.floating[T] || a.floating[b]);
      const C = O / 2 - E / 2,
        B = k / 2 - A[b] / 2 - 1,
        H = o(y[P], B),
        S = o(y[D], B),
        F = H,
        j = k - A[b] - S,
        z = k / 2 - A[b] / 2 + C,
        M = s(F, z, j),
        V =
          !m.arrow &&
          null != u(r) &&
          z !== M &&
          a.reference[b] / 2 - (z < F ? H : S) - A[b] / 2 < 0,
        W = V ? (z < F ? z - F : z - j) : 0;
      return {
        [v]: w[v] + W,
        data: {
          [v]: M,
          centerOffset: z - M - W,
          ...(V && { alignmentOffset: W }),
        },
        reset: V,
      };
    },
  })),
    (t.autoPlacement = function (t) {
      return (
        void 0 === t && (t = {}),
        {
          name: "autoPlacement",
          options: t,
          async fn(e) {
            var n, o, r;
            const {
                rects: a,
                middlewareData: l,
                placement: s,
                platform: m,
                elements: d,
              } = e,
              {
                crossAxis: g = !1,
                alignment: p,
                allowedPlacements: w = i,
                autoAlignment: x = !0,
                ...v
              } = f(t, e),
              b =
                void 0 !== p || w === i
                  ? (function (t, e, n) {
                      return (
                        t
                          ? [
                              ...n.filter((e) => u(e) === t),
                              ...n.filter((e) => u(e) !== t),
                            ]
                          : n.filter((t) => c(t) === t)
                      ).filter((n) => !t || u(n) === t || (!!e && y(n) !== n));
                    })(p || null, x, w)
                  : w,
              R = await A(e, v),
              P = (null == (n = l.autoPlacement) ? void 0 : n.index) || 0,
              D = b[P];
            if (null == D) return {};
            const T = h(
              D,
              a,
              await (null == m.isRTL ? void 0 : m.isRTL(d.floating))
            );
            if (s !== D) return { reset: { placement: b[0] } };
            const O = [R[c(D)], R[T[0]], R[T[1]]],
              E = [
                ...((null == (o = l.autoPlacement) ? void 0 : o.overflows) ||
                  []),
                { placement: D, overflows: O },
              ],
              L = b[P + 1];
            if (L)
              return {
                data: { index: P + 1, overflows: E },
                reset: { placement: L },
              };
            const k = E.map((t) => {
                const e = u(t.placement);
                return [
                  t.placement,
                  e && g
                    ? t.overflows.slice(0, 2).reduce((t, e) => t + e, 0)
                    : t.overflows[0],
                  t.overflows,
                ];
              }).sort((t, e) => t[1] - e[1]),
              C =
                (null ==
                (r = k.filter((t) =>
                  t[2].slice(0, u(t[0]) ? 2 : 3).every((t) => t <= 0)
                )[0])
                  ? void 0
                  : r[0]) || k[0][0];
            return C !== s
              ? {
                  data: { index: P + 1, overflows: E },
                  reset: { placement: C },
                }
              : {};
          },
        }
      );
    }),
    (t.computePosition = async (t, e, n) => {
      const {
          placement: i = "bottom",
          strategy: o = "absolute",
          middleware: r = [],
          platform: a,
        } = n,
        l = r.filter(Boolean),
        s = await (null == a.isRTL ? void 0 : a.isRTL(e));
      let f = await a.getElementRects({
          reference: t,
          floating: e,
          strategy: o,
        }),
        { x: c, y: u } = b(f, i, s),
        m = i,
        d = {},
        g = 0;
      for (let n = 0; n < l.length; n++) {
        const { name: r, fn: p } = l[n],
          {
            x: h,
            y: y,
            data: w,
            reset: x,
          } = await p({
            x: c,
            y: u,
            initialPlacement: i,
            placement: m,
            strategy: o,
            middlewareData: d,
            rects: f,
            platform: a,
            elements: { reference: t, floating: e },
          });
        (c = null != h ? h : c),
          (u = null != y ? y : u),
          (d = { ...d, [r]: { ...d[r], ...w } }),
          x &&
            g <= 50 &&
            (g++,
            "object" == typeof x &&
              (x.placement && (m = x.placement),
              x.rects &&
                (f =
                  !0 === x.rects
                    ? await a.getElementRects({
                        reference: t,
                        floating: e,
                        strategy: o,
                      })
                    : x.rects),
              ({ x: c, y: u } = b(f, m, s))),
            (n = -1));
      }
      return { x: c, y: u, placement: m, strategy: o, middlewareData: d };
    }),
    (t.detectOverflow = A),
    (t.flip = function (t) {
      return (
        void 0 === t && (t = {}),
        {
          name: "flip",
          options: t,
          async fn(e) {
            var n, i;
            const {
                placement: o,
                middlewareData: r,
                rects: a,
                initialPlacement: l,
                platform: s,
                elements: m,
              } = e,
              {
                mainAxis: d = !0,
                crossAxis: p = !0,
                fallbackPlacements: x,
                fallbackStrategy: v = "bestFit",
                fallbackAxisSideDirection: b = "none",
                flipAlignment: R = !0,
                ...P
              } = f(t, e);
            if (null != (n = r.arrow) && n.alignmentOffset) return {};
            const D = c(o),
              T = g(l),
              O = c(l) === l,
              E = await (null == s.isRTL ? void 0 : s.isRTL(m.floating)),
              L =
                x ||
                (O || !R
                  ? [w(l)]
                  : (function (t) {
                      const e = w(t);
                      return [y(t), e, y(e)];
                    })(l)),
              k = "none" !== b;
            !x &&
              k &&
              L.push(
                ...(function (t, e, n, i) {
                  const o = u(t);
                  let r = (function (t, e, n) {
                    const i = ["left", "right"],
                      o = ["right", "left"],
                      r = ["top", "bottom"],
                      a = ["bottom", "top"];
                    switch (t) {
                      case "top":
                      case "bottom":
                        return n ? (e ? o : i) : e ? i : o;
                      case "left":
                      case "right":
                        return e ? r : a;
                      default:
                        return [];
                    }
                  })(c(t), "start" === n, i);
                  return (
                    o &&
                      ((r = r.map((t) => t + "-" + o)),
                      e && (r = r.concat(r.map(y)))),
                    r
                  );
                })(l, R, b, E)
              );
            const C = [l, ...L],
              B = await A(e, P),
              H = [];
            let S = (null == (i = r.flip) ? void 0 : i.overflows) || [];
            if ((d && H.push(B[D]), p)) {
              const t = h(o, a, E);
              H.push(B[t[0]], B[t[1]]);
            }
            if (
              ((S = [...S, { placement: o, overflows: H }]),
              !H.every((t) => t <= 0))
            ) {
              var F, j;
              const t = ((null == (F = r.flip) ? void 0 : F.index) || 0) + 1,
                e = C[t];
              if (e) {
                var z;
                const n = "alignment" === p && T !== g(e),
                  i = (null == (z = S[0]) ? void 0 : z.overflows[0]) > 0;
                if (!n || i)
                  return {
                    data: { index: t, overflows: S },
                    reset: { placement: e },
                  };
              }
              let n =
                null ==
                (j = S.filter((t) => t.overflows[0] <= 0).sort(
                  (t, e) => t.overflows[1] - e.overflows[1]
                )[0])
                  ? void 0
                  : j.placement;
              if (!n)
                switch (v) {
                  case "bestFit": {
                    var M;
                    const t =
                      null ==
                      (M = S.filter((t) => {
                        if (k) {
                          const e = g(t.placement);
                          return e === T || "y" === e;
                        }
                        return !0;
                      })
                        .map((t) => [
                          t.placement,
                          t.overflows
                            .filter((t) => t > 0)
                            .reduce((t, e) => t + e, 0),
                        ])
                        .sort((t, e) => t[1] - e[1])[0])
                        ? void 0
                        : M[0];
                    t && (n = t);
                    break;
                  }
                  case "initialPlacement":
                    n = l;
                }
              if (o !== n) return { reset: { placement: n } };
            }
            return {};
          },
        }
      );
    }),
    (t.hide = function (t) {
      return (
        void 0 === t && (t = {}),
        {
          name: "hide",
          options: t,
          async fn(e) {
            const { rects: n } = e,
              { strategy: i = "referenceHidden", ...o } = f(t, e);
            switch (i) {
              case "referenceHidden": {
                const t = R(
                  await A(e, { ...o, elementContext: "reference" }),
                  n.reference
                );
                return {
                  data: { referenceHiddenOffsets: t, referenceHidden: P(t) },
                };
              }
              case "escaped": {
                const t = R(await A(e, { ...o, altBoundary: !0 }), n.floating);
                return { data: { escapedOffsets: t, escaped: P(t) } };
              }
              default:
                return {};
            }
          },
        }
      );
    }),
    (t.inline = function (t) {
      return (
        void 0 === t && (t = {}),
        {
          name: "inline",
          options: t,
          async fn(e) {
            const {
                placement: n,
                elements: i,
                rects: a,
                platform: l,
                strategy: s,
              } = e,
              { padding: u = 2, x: m, y: d } = f(t, e),
              p = Array.from(
                (await (null == l.getClientRects
                  ? void 0
                  : l.getClientRects(i.reference))) || []
              ),
              h = (function (t) {
                const e = t.slice().sort((t, e) => t.y - e.y),
                  n = [];
                let i = null;
                for (let t = 0; t < e.length; t++) {
                  const o = e[t];
                  !i || o.y - i.y > i.height / 2
                    ? n.push([o])
                    : n[n.length - 1].push(o),
                    (i = o);
                }
                return n.map((t) => v(D(t)));
              })(p),
              y = v(D(p)),
              w = x(u);
            const b = await l.getElementRects({
              reference: {
                getBoundingClientRect: function () {
                  if (
                    2 === h.length &&
                    h[0].left > h[1].right &&
                    null != m &&
                    null != d
                  )
                    return (
                      h.find(
                        (t) =>
                          m > t.left - w.left &&
                          m < t.right + w.right &&
                          d > t.top - w.top &&
                          d < t.bottom + w.bottom
                      ) || y
                    );
                  if (h.length >= 2) {
                    if ("y" === g(n)) {
                      const t = h[0],
                        e = h[h.length - 1],
                        i = "top" === c(n),
                        o = t.top,
                        r = e.bottom,
                        a = i ? t.left : e.left,
                        l = i ? t.right : e.right;
                      return {
                        top: o,
                        bottom: r,
                        left: a,
                        right: l,
                        width: l - a,
                        height: r - o,
                        x: a,
                        y: o,
                      };
                    }
                    const t = "left" === c(n),
                      e = r(...h.map((t) => t.right)),
                      i = o(...h.map((t) => t.left)),
                      a = h.filter((n) => (t ? n.left === i : n.right === e)),
                      l = a[0].top,
                      s = a[a.length - 1].bottom;
                    return {
                      top: l,
                      bottom: s,
                      left: i,
                      right: e,
                      width: e - i,
                      height: s - l,
                      x: i,
                      y: l,
                    };
                  }
                  return y;
                },
              },
              floating: i.floating,
              strategy: s,
            });
            return a.reference.x !== b.reference.x ||
              a.reference.y !== b.reference.y ||
              a.reference.width !== b.reference.width ||
              a.reference.height !== b.reference.height
              ? { reset: { rects: b } }
              : {};
          },
        }
      );
    }),
    (t.limitShift = function (t) {
      return (
        void 0 === t && (t = {}),
        {
          options: t,
          fn(e) {
            const { x: n, y: i, placement: o, rects: r, middlewareData: a } = e,
              { offset: l = 0, mainAxis: s = !0, crossAxis: u = !0 } = f(t, e),
              d = { x: n, y: i },
              p = g(o),
              h = m(p);
            let y = d[h],
              w = d[p];
            const x = f(l, e),
              v =
                "number" == typeof x
                  ? { mainAxis: x, crossAxis: 0 }
                  : { mainAxis: 0, crossAxis: 0, ...x };
            if (s) {
              const t = "y" === h ? "height" : "width",
                e = r.reference[h] - r.floating[t] + v.mainAxis,
                n = r.reference[h] + r.reference[t] - v.mainAxis;
              y < e ? (y = e) : y > n && (y = n);
            }
            if (u) {
              var b, A;
              const t = "y" === h ? "width" : "height",
                e = ["top", "left"].includes(c(o)),
                n =
                  r.reference[p] -
                  r.floating[t] +
                  ((e && (null == (b = a.offset) ? void 0 : b[p])) || 0) +
                  (e ? 0 : v.crossAxis),
                i =
                  r.reference[p] +
                  r.reference[t] +
                  (e ? 0 : (null == (A = a.offset) ? void 0 : A[p]) || 0) -
                  (e ? v.crossAxis : 0);
              w < n ? (w = n) : w > i && (w = i);
            }
            return { [h]: y, [p]: w };
          },
        }
      );
    }),
    (t.offset = function (t) {
      return (
        void 0 === t && (t = 0),
        {
          name: "offset",
          options: t,
          async fn(e) {
            var n, i;
            const { x: o, y: r, placement: a, middlewareData: l } = e,
              s = await (async function (t, e) {
                const { placement: n, platform: i, elements: o } = t,
                  r = await (null == i.isRTL ? void 0 : i.isRTL(o.floating)),
                  a = c(n),
                  l = u(n),
                  s = "y" === g(n),
                  m = ["left", "top"].includes(a) ? -1 : 1,
                  d = r && s ? -1 : 1,
                  p = f(e, t);
                let {
                  mainAxis: h,
                  crossAxis: y,
                  alignmentAxis: w,
                } = "number" == typeof p
                  ? { mainAxis: p, crossAxis: 0, alignmentAxis: null }
                  : {
                      mainAxis: p.mainAxis || 0,
                      crossAxis: p.crossAxis || 0,
                      alignmentAxis: p.alignmentAxis,
                    };
                return (
                  l && "number" == typeof w && (y = "end" === l ? -1 * w : w),
                  s ? { x: y * d, y: h * m } : { x: h * m, y: y * d }
                );
              })(e, t);
            return a === (null == (n = l.offset) ? void 0 : n.placement) &&
              null != (i = l.arrow) &&
              i.alignmentOffset
              ? {}
              : { x: o + s.x, y: r + s.y, data: { ...s, placement: a } };
          },
        }
      );
    }),
    (t.rectToClientRect = v),
    (t.shift = function (t) {
      return (
        void 0 === t && (t = {}),
        {
          name: "shift",
          options: t,
          async fn(e) {
            const { x: n, y: i, placement: o } = e,
              {
                mainAxis: r = !0,
                crossAxis: a = !1,
                limiter: l = {
                  fn: (t) => {
                    let { x: e, y: n } = t;
                    return { x: e, y: n };
                  },
                },
                ...u
              } = f(t, e),
              d = { x: n, y: i },
              p = await A(e, u),
              h = g(c(o)),
              y = m(h);
            let w = d[y],
              x = d[h];
            if (r) {
              const t = "y" === y ? "bottom" : "right";
              w = s(w + p["y" === y ? "top" : "left"], w, w - p[t]);
            }
            if (a) {
              const t = "y" === h ? "bottom" : "right";
              x = s(x + p["y" === h ? "top" : "left"], x, x - p[t]);
            }
            const v = l.fn({ ...e, [y]: w, [h]: x });
            return {
              ...v,
              data: { x: v.x - n, y: v.y - i, enabled: { [y]: r, [h]: a } },
            };
          },
        }
      );
    }),
    (t.size = function (t) {
      return (
        void 0 === t && (t = {}),
        {
          name: "size",
          options: t,
          async fn(e) {
            var n, i;
            const { placement: a, rects: l, platform: s, elements: m } = e,
              { apply: d = () => {}, ...p } = f(t, e),
              h = await A(e, p),
              y = c(a),
              w = u(a),
              x = "y" === g(a),
              { width: v, height: b } = l.floating;
            let R, P;
            "top" === y || "bottom" === y
              ? ((R = y),
                (P =
                  w ===
                  ((await (null == s.isRTL ? void 0 : s.isRTL(m.floating)))
                    ? "start"
                    : "end")
                    ? "left"
                    : "right"))
              : ((P = y), (R = "end" === w ? "top" : "bottom"));
            const D = b - h.top - h.bottom,
              T = v - h.left - h.right,
              O = o(b - h[R], D),
              E = o(v - h[P], T),
              L = !e.middlewareData.shift;
            let k = O,
              C = E;
            if (
              (null != (n = e.middlewareData.shift) && n.enabled.x && (C = T),
              null != (i = e.middlewareData.shift) && i.enabled.y && (k = D),
              L && !w)
            ) {
              const t = r(h.left, 0),
                e = r(h.right, 0),
                n = r(h.top, 0),
                i = r(h.bottom, 0);
              x
                ? (C =
                    v - 2 * (0 !== t || 0 !== e ? t + e : r(h.left, h.right)))
                : (k =
                    b - 2 * (0 !== n || 0 !== i ? n + i : r(h.top, h.bottom)));
            }
            await d({ ...e, availableWidth: C, availableHeight: k });
            const B = await s.getDimensions(m.floating);
            return v !== B.width || b !== B.height
              ? { reset: { rects: !0 } }
              : {};
          },
        }
      );
    });
});

// components/floatingui/floating_ui_dom.js
// https://cdn.jsdelivr.net/npm/@floating-ui/dom@1.7.0
!(function (t, e) {
  "object" == typeof exports && "undefined" != typeof module
    ? e(exports, require("./floating_ui_core"))
    : "function" == typeof define && define.amd
    ? define(["exports", "./floatingUICore"], e)
    : e(
        ((t =
          "undefined" != typeof globalThis
            ? globalThis
            : t || self).FloatingUIDOM = {}),
        t.FloatingUICore
      );
})(this, function (t, e) {
  "use strict";
  const n = Math.min,
    o = Math.max,
    i = Math.round,
    r = Math.floor,
    c = (t) => ({ x: t, y: t });
  function l() {
    return "undefined" != typeof window;
  }
  function s(t) {
    return a(t) ? (t.nodeName || "").toLowerCase() : "#document";
  }
  function f(t) {
    var e;
    return (
      (null == t || null == (e = t.ownerDocument) ? void 0 : e.defaultView) ||
      window
    );
  }
  function u(t) {
    var e;
    return null ==
      (e = (a(t) ? t.ownerDocument : t.document) || window.document)
      ? void 0
      : e.documentElement;
  }
  function a(t) {
    return !!l() && (t instanceof Node || t instanceof f(t).Node);
  }
  function d(t) {
    return !!l() && (t instanceof Element || t instanceof f(t).Element);
  }
  function h(t) {
    return !!l() && (t instanceof HTMLElement || t instanceof f(t).HTMLElement);
  }
  function p(t) {
    return (
      !(!l() || "undefined" == typeof ShadowRoot) &&
      (t instanceof ShadowRoot || t instanceof f(t).ShadowRoot)
    );
  }
  function g(t) {
    const { overflow: e, overflowX: n, overflowY: o, display: i } = b(t);
    return (
      /auto|scroll|overlay|hidden|clip/.test(e + o + n) &&
      !["inline", "contents"].includes(i)
    );
  }
  function m(t) {
    return ["table", "td", "th"].includes(s(t));
  }
  function y(t) {
    return [":popover-open", ":modal"].some((e) => {
      try {
        return t.matches(e);
      } catch (t) {
        return !1;
      }
    });
  }
  function w(t) {
    const e = x(),
      n = d(t) ? b(t) : t;
    return (
      ["transform", "translate", "scale", "rotate", "perspective"].some(
        (t) => !!n[t] && "none" !== n[t]
      ) ||
      (!!n.containerType && "normal" !== n.containerType) ||
      (!e && !!n.backdropFilter && "none" !== n.backdropFilter) ||
      (!e && !!n.filter && "none" !== n.filter) ||
      [
        "transform",
        "translate",
        "scale",
        "rotate",
        "perspective",
        "filter",
      ].some((t) => (n.willChange || "").includes(t)) ||
      ["paint", "layout", "strict", "content"].some((t) =>
        (n.contain || "").includes(t)
      )
    );
  }
  function x() {
    return (
      !("undefined" == typeof CSS || !CSS.supports) &&
      CSS.supports("-webkit-backdrop-filter", "none")
    );
  }
  function v(t) {
    return ["html", "body", "#document"].includes(s(t));
  }
  function b(t) {
    return f(t).getComputedStyle(t);
  }
  function T(t) {
    return d(t)
      ? { scrollLeft: t.scrollLeft, scrollTop: t.scrollTop }
      : { scrollLeft: t.scrollX, scrollTop: t.scrollY };
  }
  function L(t) {
    if ("html" === s(t)) return t;
    const e = t.assignedSlot || t.parentNode || (p(t) && t.host) || u(t);
    return p(e) ? e.host : e;
  }
  function R(t) {
    const e = L(t);
    return v(e)
      ? t.ownerDocument
        ? t.ownerDocument.body
        : t.body
      : h(e) && g(e)
      ? e
      : R(e);
  }
  function C(t, e, n) {
    var o;
    void 0 === e && (e = []), void 0 === n && (n = !0);
    const i = R(t),
      r = i === (null == (o = t.ownerDocument) ? void 0 : o.body),
      c = f(i);
    if (r) {
      const t = E(c);
      return e.concat(
        c,
        c.visualViewport || [],
        g(i) ? i : [],
        t && n ? C(t) : []
      );
    }
    return e.concat(i, C(i, [], n));
  }
  function E(t) {
    return t.parent && Object.getPrototypeOf(t.parent) ? t.frameElement : null;
  }
  function S(t) {
    const e = b(t);
    let n = parseFloat(e.width) || 0,
      o = parseFloat(e.height) || 0;
    const r = h(t),
      c = r ? t.offsetWidth : n,
      l = r ? t.offsetHeight : o,
      s = i(n) !== c || i(o) !== l;
    return s && ((n = c), (o = l)), { width: n, height: o, $: s };
  }
  function F(t) {
    return d(t) ? t : t.contextElement;
  }
  function O(t) {
    const e = F(t);
    if (!h(e)) return c(1);
    const n = e.getBoundingClientRect(),
      { width: o, height: r, $: l } = S(e);
    let s = (l ? i(n.width) : n.width) / o,
      f = (l ? i(n.height) : n.height) / r;
    return (
      (s && Number.isFinite(s)) || (s = 1),
      (f && Number.isFinite(f)) || (f = 1),
      { x: s, y: f }
    );
  }
  const D = c(0);
  function H(t) {
    const e = f(t);
    return x() && e.visualViewport
      ? { x: e.visualViewport.offsetLeft, y: e.visualViewport.offsetTop }
      : D;
  }
  function P(t, n, o, i) {
    void 0 === n && (n = !1), void 0 === o && (o = !1);
    const r = t.getBoundingClientRect(),
      l = F(t);
    let s = c(1);
    n && (i ? d(i) && (s = O(i)) : (s = O(t)));
    const u = (function (t, e, n) {
      return void 0 === e && (e = !1), !(!n || (e && n !== f(t))) && e;
    })(l, o, i)
      ? H(l)
      : c(0);
    let a = (r.left + u.x) / s.x,
      h = (r.top + u.y) / s.y,
      p = r.width / s.x,
      g = r.height / s.y;
    if (l) {
      const t = f(l),
        e = i && d(i) ? f(i) : i;
      let n = t,
        o = E(n);
      for (; o && i && e !== n; ) {
        const t = O(o),
          e = o.getBoundingClientRect(),
          i = b(o),
          r = e.left + (o.clientLeft + parseFloat(i.paddingLeft)) * t.x,
          c = e.top + (o.clientTop + parseFloat(i.paddingTop)) * t.y;
        (a *= t.x),
          (h *= t.y),
          (p *= t.x),
          (g *= t.y),
          (a += r),
          (h += c),
          (n = f(o)),
          (o = E(n));
      }
    }
    return e.rectToClientRect({ width: p, height: g, x: a, y: h });
  }
  function W(t, e) {
    const n = T(t).scrollLeft;
    return e ? e.left + n : P(u(t)).left + n;
  }
  function M(t, e, n) {
    void 0 === n && (n = !1);
    const o = t.getBoundingClientRect();
    return {
      x: o.left + e.scrollLeft - (n ? 0 : W(t, o)),
      y: o.top + e.scrollTop,
    };
  }
  function z(t, n, i) {
    let r;
    if ("viewport" === n)
      r = (function (t, e) {
        const n = f(t),
          o = u(t),
          i = n.visualViewport;
        let r = o.clientWidth,
          c = o.clientHeight,
          l = 0,
          s = 0;
        if (i) {
          (r = i.width), (c = i.height);
          const t = x();
          (!t || (t && "fixed" === e)) &&
            ((l = i.offsetLeft), (s = i.offsetTop));
        }
        return { width: r, height: c, x: l, y: s };
      })(t, i);
    else if ("document" === n)
      r = (function (t) {
        const e = u(t),
          n = T(t),
          i = t.ownerDocument.body,
          r = o(e.scrollWidth, e.clientWidth, i.scrollWidth, i.clientWidth),
          c = o(e.scrollHeight, e.clientHeight, i.scrollHeight, i.clientHeight);
        let l = -n.scrollLeft + W(t);
        const s = -n.scrollTop;
        return (
          "rtl" === b(i).direction &&
            (l += o(e.clientWidth, i.clientWidth) - r),
          { width: r, height: c, x: l, y: s }
        );
      })(u(t));
    else if (d(n))
      r = (function (t, e) {
        const n = P(t, !0, "fixed" === e),
          o = n.top + t.clientTop,
          i = n.left + t.clientLeft,
          r = h(t) ? O(t) : c(1);
        return {
          width: t.clientWidth * r.x,
          height: t.clientHeight * r.y,
          x: i * r.x,
          y: o * r.y,
        };
      })(n, i);
    else {
      const e = H(t);
      r = { x: n.x - e.x, y: n.y - e.y, width: n.width, height: n.height };
    }
    return e.rectToClientRect(r);
  }
  function A(t, e) {
    const n = L(t);
    return (
      !(n === e || !d(n) || v(n)) && ("fixed" === b(n).position || A(n, e))
    );
  }
  function B(t, e, n) {
    const o = h(e),
      i = u(e),
      r = "fixed" === n,
      l = P(t, !0, r, e);
    let f = { scrollLeft: 0, scrollTop: 0 };
    const a = c(0);
    function d() {
      a.x = W(i);
    }
    if (o || (!o && !r))
      if ((("body" !== s(e) || g(i)) && (f = T(e)), o)) {
        const t = P(e, !0, r, e);
        (a.x = t.x + e.clientLeft), (a.y = t.y + e.clientTop);
      } else i && d();
    r && !o && i && d();
    const p = !i || o || r ? c(0) : M(i, f);
    return {
      x: l.left + f.scrollLeft - a.x - p.x,
      y: l.top + f.scrollTop - a.y - p.y,
      width: l.width,
      height: l.height,
    };
  }
  function V(t) {
    return "static" === b(t).position;
  }
  function N(t, e) {
    if (!h(t) || "fixed" === b(t).position) return null;
    if (e) return e(t);
    let n = t.offsetParent;
    return u(t) === n && (n = n.ownerDocument.body), n;
  }
  function I(t, e) {
    const n = f(t);
    if (y(t)) return n;
    if (!h(t)) {
      let e = L(t);
      for (; e && !v(e); ) {
        if (d(e) && !V(e)) return e;
        e = L(e);
      }
      return n;
    }
    let o = N(t, e);
    for (; o && m(o) && V(o); ) o = N(o, e);
    return o && v(o) && V(o) && !w(o)
      ? n
      : o ||
          (function (t) {
            let e = L(t);
            for (; h(e) && !v(e); ) {
              if (w(e)) return e;
              if (y(e)) return null;
              e = L(e);
            }
            return null;
          })(t) ||
          n;
  }
  const k = {
    convertOffsetParentRelativeRectToViewportRelativeRect: function (t) {
      let { elements: e, rect: n, offsetParent: o, strategy: i } = t;
      const r = "fixed" === i,
        l = u(o),
        f = !!e && y(e.floating);
      if (o === l || (f && r)) return n;
      let a = { scrollLeft: 0, scrollTop: 0 },
        d = c(1);
      const p = c(0),
        m = h(o);
      if (
        (m || (!m && !r)) &&
        (("body" !== s(o) || g(l)) && (a = T(o)), h(o))
      ) {
        const t = P(o);
        (d = O(o)), (p.x = t.x + o.clientLeft), (p.y = t.y + o.clientTop);
      }
      const w = !l || m || r ? c(0) : M(l, a, !0);
      return {
        width: n.width * d.x,
        height: n.height * d.y,
        x: n.x * d.x - a.scrollLeft * d.x + p.x + w.x,
        y: n.y * d.y - a.scrollTop * d.y + p.y + w.y,
      };
    },
    getDocumentElement: u,
    getClippingRect: function (t) {
      let { element: e, boundary: i, rootBoundary: r, strategy: c } = t;
      const l = [
          ...("clippingAncestors" === i
            ? y(e)
              ? []
              : (function (t, e) {
                  const n = e.get(t);
                  if (n) return n;
                  let o = C(t, [], !1).filter((t) => d(t) && "body" !== s(t)),
                    i = null;
                  const r = "fixed" === b(t).position;
                  let c = r ? L(t) : t;
                  for (; d(c) && !v(c); ) {
                    const e = b(c),
                      n = w(c);
                    n || "fixed" !== e.position || (i = null),
                      (
                        r
                          ? !n && !i
                          : (!n &&
                              "static" === e.position &&
                              i &&
                              ["absolute", "fixed"].includes(i.position)) ||
                            (g(c) && !n && A(t, c))
                      )
                        ? (o = o.filter((t) => t !== c))
                        : (i = e),
                      (c = L(c));
                  }
                  return e.set(t, o), o;
                })(e, this._c)
            : [].concat(i)),
          r,
        ],
        f = l[0],
        u = l.reduce((t, i) => {
          const r = z(e, i, c);
          return (
            (t.top = o(r.top, t.top)),
            (t.right = n(r.right, t.right)),
            (t.bottom = n(r.bottom, t.bottom)),
            (t.left = o(r.left, t.left)),
            t
          );
        }, z(e, f, c));
      return {
        width: u.right - u.left,
        height: u.bottom - u.top,
        x: u.left,
        y: u.top,
      };
    },
    getOffsetParent: I,
    getElementRects: async function (t) {
      const e = this.getOffsetParent || I,
        n = this.getDimensions,
        o = await n(t.floating);
      return {
        reference: B(t.reference, await e(t.floating), t.strategy),
        floating: { x: 0, y: 0, width: o.width, height: o.height },
      };
    },
    getClientRects: function (t) {
      return Array.from(t.getClientRects());
    },
    getDimensions: function (t) {
      const { width: e, height: n } = S(t);
      return { width: e, height: n };
    },
    getScale: O,
    isElement: d,
    isRTL: function (t) {
      return "rtl" === b(t).direction;
    },
  };
  function q(t, e) {
    return (
      t.x === e.x && t.y === e.y && t.width === e.width && t.height === e.height
    );
  }
  const U = e.detectOverflow,
    j = e.offset,
    X = e.autoPlacement,
    Y = e.shift,
    $ = e.flip,
    _ = e.size,
    G = e.hide,
    J = e.arrow,
    K = e.inline,
    Q = e.limitShift;
  (t.arrow = J),
    (t.autoPlacement = X),
    (t.autoUpdate = function (t, e, i, c) {
      void 0 === c && (c = {});
      const {
          ancestorScroll: l = !0,
          ancestorResize: s = !0,
          elementResize: f = "function" == typeof ResizeObserver,
          layoutShift: a = "function" == typeof IntersectionObserver,
          animationFrame: d = !1,
        } = c,
        h = F(t),
        p = l || s ? [...(h ? C(h) : []), ...C(e)] : [];
      p.forEach((t) => {
        l && t.addEventListener("scroll", i, { passive: !0 }),
          s && t.addEventListener("resize", i);
      });
      const g =
        h && a
          ? (function (t, e) {
              let i,
                c = null;
              const l = u(t);
              function s() {
                var t;
                clearTimeout(i), null == (t = c) || t.disconnect(), (c = null);
              }
              return (
                (function f(u, a) {
                  void 0 === u && (u = !1), void 0 === a && (a = 1), s();
                  const d = t.getBoundingClientRect(),
                    { left: h, top: p, width: g, height: m } = d;
                  if ((u || e(), !g || !m)) return;
                  const y = {
                    rootMargin:
                      -r(p) +
                      "px " +
                      -r(l.clientWidth - (h + g)) +
                      "px " +
                      -r(l.clientHeight - (p + m)) +
                      "px " +
                      -r(h) +
                      "px",
                    threshold: o(0, n(1, a)) || 1,
                  };
                  let w = !0;
                  function x(e) {
                    const n = e[0].intersectionRatio;
                    if (n !== a) {
                      if (!w) return f();
                      n
                        ? f(!1, n)
                        : (i = setTimeout(() => {
                            f(!1, 1e-7);
                          }, 1e3));
                    }
                    1 !== n || q(d, t.getBoundingClientRect()) || f(), (w = !1);
                  }
                  try {
                    c = new IntersectionObserver(x, {
                      ...y,
                      root: l.ownerDocument,
                    });
                  } catch (t) {
                    c = new IntersectionObserver(x, y);
                  }
                  c.observe(t);
                })(!0),
                s
              );
            })(h, i)
          : null;
      let m,
        y = -1,
        w = null;
      f &&
        ((w = new ResizeObserver((t) => {
          let [n] = t;
          n &&
            n.target === h &&
            w &&
            (w.unobserve(e),
            cancelAnimationFrame(y),
            (y = requestAnimationFrame(() => {
              var t;
              null == (t = w) || t.observe(e);
            }))),
            i();
        })),
        h && !d && w.observe(h),
        w.observe(e));
      let x = d ? P(t) : null;
      return (
        d &&
          (function e() {
            const n = P(t);
            x && !q(x, n) && i();
            (x = n), (m = requestAnimationFrame(e));
          })(),
        i(),
        () => {
          var t;
          p.forEach((t) => {
            l && t.removeEventListener("scroll", i),
              s && t.removeEventListener("resize", i);
          }),
            null == g || g(),
            null == (t = w) || t.disconnect(),
            (w = null),
            d && cancelAnimationFrame(m);
        }
      );
    }),
    (t.computePosition = (t, n, o) => {
      const i = new Map(),
        r = { platform: k, ...o },
        c = { ...r.platform, _c: i };
      return e.computePosition(t, n, { ...r, platform: c });
    }),
    (t.detectOverflow = U),
    (t.flip = $),
    (t.getOverflowAncestors = C),
    (t.hide = G),
    (t.inline = K),
    (t.limitShift = Q),
    (t.offset = j),
    (t.platform = k),
    (t.shift = Y),
    (t.size = _);

  // We put this manually here because we need to make sure it's available
  // before the popover component is initialized.
  window.FloatingUIDOM = t;
  return t;
});

// components/hovercard/hovercard.js
// Uses window.FloatingUIDOM from components/floatingui (loaded in the same bundle).
(function () {
  // Exit animations run for 100ms (duration-100); hide shortly after.
  const EXIT_MS = 120;

  const escapeTargets = new WeakSet();
  function listenForEscape(element) {
    if (!element || escapeTargets.has(element)) return;
    element.addEventListener("keydown", closeOnEscapeKeyDown);
    escapeTargets.add(element);
  }

  // useDismiss: popup/reference listeners stop Escape before outer document handlers.
  function closeOnEscapeKeyDown(event) {
    if (event.key !== "Escape") return;
    const contents = event.currentTarget === document
      ? allContents()
      : [event.currentTarget.hasAttribute("data-tui-hovercard-content")
        ? event.currentTarget
        : contentFor(event.currentTarget)];
    let handled = false;
    for (const content of contents) {
      if (!content?.hasAttribute("data-open")) continue;
      if (requestOpenChange(content, false)) event.preventDefault();
      event.stopPropagation();
      handled = true;
    }
    return handled;
  }

  function allContents() {
    return document.querySelectorAll("[data-tui-hovercard-content]");
  }

  function contentFor(trigger) {
    return document.getElementById(trigger.getAttribute("data-tui-hovercard-for"));
  }

  function triggerFor(content) {
    return document.querySelector(
      '[data-tui-hovercard-trigger][data-tui-hovercard-for="' + content.id + '"]',
    );
  }

  function setOpenState(content, open) {
    content.toggleAttribute("data-open", open);
    content.toggleAttribute("data-closed", !open);
  }

  // Base UI zooms the popup out of the anchor's center point (e.g.
  // "96px -4px"), not out of a placement corner.
  function anchorOrigin(result, anchorRect, positionerRect, sideOffset) {
    const side = result.placement.split("-")[0];
    const centerX = anchorRect.left + anchorRect.width / 2 - positionerRect.left + "px";
    const centerY = anchorRect.top + anchorRect.height / 2 - positionerRect.top + "px";
    if (side === "bottom") return centerX + " " + -sideOffset + "px";
    if (side === "top") return centerX + " calc(100% + " + sideOffset + "px)";
    if (side === "right") return -sideOffset + "px " + centerY;
    return "calc(100% + " + sideOffset + "px) " + centerY;
  }

  // Moves the content to <body> (shadcn portals it the same way).
  // The unmount half of the React portal pendant: a portaled content lives
  // as long as its SSR declaration site (_tuiPortalOwner) stays in the
  // document. Trigger-presence heuristics judged mid-swap moments wrongly -
  // multi-phase swap layers briefly disconnect the new triggers.
  function removeOrphanedContents(content) {
    document.querySelectorAll("body > [data-tui-hovercard-content]").forEach((c) => {
      if (c !== content && c._tuiPortalOwner && !c._tuiPortalOwner.isConnected) {
        stopAutoPositioning(c);
        c.remove();
      }
    });
  }

  function portal(content) {
    listenForEscape(content);
    removeOrphanedContents(content);
    if (content.parentElement !== document.body) {
      if (!content._tuiPortalOwner) content._tuiPortalOwner = content.parentElement;
      document.body.appendChild(content);
    }
  }

  function positionContent(content, trigger) {
    const { computePosition, offset, flip, shift } = window.FloatingUIDOM;
    const side = content.getAttribute("data-tui-hovercard-side") || "bottom";
    const align = content.getAttribute("data-tui-hovercard-align") || "center";
    const sideOffset =
      parseInt(content.getAttribute("data-tui-hovercard-side-offset"), 10) || 4;
    const alignOffset =
      parseInt(content.getAttribute("data-tui-hovercard-align-offset"), 10) || 0;
    const placement = align === "center" ? side : side + "-" + align;

    return computePosition(trigger, content, {
      placement: placement,
      strategy: "absolute",
      middleware: [
        offset({ mainAxis: sideOffset, alignmentAxis: alignOffset }),
        flip(),
        shift({ padding: 5 }),
      ],
    }).then((result) => {
      content.style.transition = "none";
      content.style.left = result.x + "px";
      content.style.top = result.y + "px";
      content.style.setProperty(
        "--tui-hovercard-transform-origin",
        anchorOrigin(
          result,
          trigger.getBoundingClientRect(),
          content.getBoundingClientRect(),
          sideOffset,
        ),
      );
      content.setAttribute("data-side", result.placement.split("-")[0]);
      content.offsetHeight; // flush styles before re-enabling transitions
      content.style.transition = "";
    });
  }

  function startAutoPositioning(content, trigger) {
    if (content._tuiPositionCleanup) content._tuiPositionCleanup();
    let resolveFirst;
    const firstPosition = new Promise((resolve) => {
      resolveFirst = resolve;
    });
    const update = () => positionContent(content, trigger).then(resolveFirst, resolveFirst);
    content._tuiPositionCleanup = window.FloatingUIDOM.autoUpdate(trigger, content, update, {
      elementResize: typeof ResizeObserver !== "undefined",
      layoutShift: typeof IntersectionObserver !== "undefined",
    });
    return firstPosition;
  }

  function stopAutoPositioning(content) {
    if (!content._tuiPositionCleanup) return;
    content._tuiPositionCleanup();
    content._tuiPositionCleanup = null;
  }

  function open(content, trigger) {
    clearTimeout(content._tuiHide);
    portal(content);
    // z-index portal like shadcn (no native top layer); re-append
    // keeps paint order = open order.
    document.body.appendChild(content);
    content.hidden = false;

    // Position it invisibly first, then play the enter animation in place.
    content.style.visibility = "hidden";
    startAutoPositioning(content, trigger).then(() => {
      if (content.hidden) return; // closed meanwhile
      // duration-100 transitions `all`; a visibility transition would
      // freeze at hidden in background tabs - flip suppressed.
      content.style.transitionProperty = "none";
      content.style.visibility = "";
      void content.offsetWidth;
      content.style.transitionProperty = "";
      setOpenState(content, true);
    });
  }

  function close(content) {
    if (content.hidden) return;
    stopAutoPositioning(content);
    setOpenState(content, false);
    clearTimeout(content._tuiHide);
    content._tuiHide = setTimeout(() => {
      if (content.hasAttribute("data-closed") && !content.hidden) {
        content.hidden = true;
      }
    }, EXIT_MS);
  }

  function requestOpenChange(content, nextOpen) {
  const trigger = triggerFor(content);
  const change = new CustomEvent("hovercard-open-change", {
    bubbles: true,
    cancelable: true,
    detail: { open: nextOpen },
  });
  const accepted = (trigger || content).dispatchEvent(change);
  if (!accepted || content.hasAttribute("data-tui-hovercard-controlled")) return false;
  if (nextOpen && trigger) open(content, trigger);
  else if (!nextOpen) close(content);
  return true;
  }

  // Hover intent: entering trigger or card keeps it open; leaving both
  // schedules the close after the card's close delay.
  function scheduleOpen(content, trigger) {
    clearTimeout(content._tuiClose);
    content._tuiClose = null;
    if (content.hasAttribute("data-open") || content._tuiOpen) return;
    const delay = parseInt(content.getAttribute("data-tui-hovercard-delay"), 10) || 600;
    content._tuiOpen = setTimeout(() => {
      content._tuiOpen = null;
    requestOpenChange(content, true);
    }, delay);
  }

  function scheduleClose(content) {
    clearTimeout(content._tuiOpen);
    content._tuiOpen = null;
    if (!content.hasAttribute("data-open") || content._tuiClose) return;
    const delay = parseInt(content.getAttribute("data-tui-hovercard-close-delay"), 10) || 300;
    content._tuiClose = setTimeout(() => {
      content._tuiClose = null;
    requestOpenChange(content, false);
    }, delay);
  }

  document.addEventListener("mouseover", (e) => {
    const trigger = e.target.closest("[data-tui-hovercard-trigger]");
    if (trigger) {
      const content = contentFor(trigger);
      if (content) scheduleOpen(content, trigger);
      return;
    }
    const content = e.target.closest("[data-tui-hovercard-content]");
    if (content) {
      clearTimeout(content._tuiClose);
      content._tuiClose = null;
    }
  });

  document.addEventListener("mouseout", (e) => {
    const from = e.target.closest("[data-tui-hovercard-trigger], [data-tui-hovercard-content]");
    if (!from) return;
    const content = from.hasAttribute("data-tui-hovercard-content")
      ? from
      : contentFor(from);
    if (!content) return;
    if (e.relatedTarget) {
      const to = e.relatedTarget.closest("[data-tui-hovercard-trigger], [data-tui-hovercard-content]");
      // Only moving between THIS card's trigger and popup keeps it open;
      // landing on another instance must still close this one.
      if (to) {
        const toContent = to.hasAttribute("data-tui-hovercard-content")
          ? to
          : contentFor(to);
        if (toContent === content) return;
      }
    }
    scheduleClose(content);
  });

  document.addEventListener("keydown", closeOnEscapeKeyDown);

  function init() {
    removeOrphanedContents();
    document.querySelectorAll("[data-tui-hovercard-trigger]").forEach(listenForEscape);
    allContents().forEach((content) => {
      if (content.getAttribute("data-tui-hovercard-initial-open") === "true") {
        content.removeAttribute("data-tui-hovercard-initial-open");
        const trigger = triggerFor(content);
        if (trigger) open(content, trigger);
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
  // Re-init on any childList mutation, directly (never rAF-deferred: rAF
  // does not fire in hidden tabs or throttled iframes): swapped-in markup
  // wires itself, removals release portaled content through the
  // ownership sweep.
  new MutationObserver(() => init()).observe(document.body, { childList: true, subtree: true });

})();

// components/inputgroup/inputgroup.js
(function () {
  "use strict";

  // shadcn's InputGroupAddon focuses the group's input when clicked, unless
  // the click landed on a button.
  document.addEventListener("click", (e) => {
    if (!(e.target instanceof Element)) return;
    const addon = e.target.closest('[data-slot="input-group-addon"]');
    if (!addon || e.target.closest("button")) return;
    const input = addon.parentElement && addon.parentElement.querySelector("input");
    if (input) input.focus();
  });
})();

// components/inputotp/inputotp.js
(function () {
  "use strict";

  // Pendant of the input-otp library: one invisible real input over the
  // container drives everything, the slots only display state.

  function roots() {
    return document.querySelectorAll("[data-tui-inputotp]");
  }

  function inputOf(root) {
    return root.querySelector("[data-tui-inputotp-input]");
  }

  function slotsOf(root) {
    return Array.from(root.querySelectorAll("[data-tui-inputotp-slot]")).sort(
      (a, b) =>
        parseInt(a.getAttribute("data-tui-inputotp-index")) -
        parseInt(b.getAttribute("data-tui-inputotp-index")),
    );
  }

  function sanitize(root, value) {
    const pattern = root.getAttribute("data-tui-inputotp-pattern");
    let out = "";
    for (const ch of value) {
      if (!pattern || new RegExp(pattern).test(ch)) out += ch;
    }
    return out.slice(0, slotsOf(root).length);
  }

  // input-otp never places the caret where the pointer landed: focus and
  // clicks always jump to the first empty slot, or select the last
  // character when the value is complete.
  function forceEndSelection(root) {
    const input = inputOf(root);
    const max = slotsOf(root).length;
    const len = input.value.length;
    if (len === max && max > 0) {
      input.setSelectionRange(len - 1, len);
    } else {
      input.setSelectionRange(len, len);
    }
  }

  function normalizeSelection(root) {
    const input = inputOf(root);
    const max = slotsOf(root).length;
    const len = input.value.length;
    if (document.activeElement !== input) return;
    let start = input.selectionStart;
    let end = input.selectionEnd;
    if (len === max && start >= len && end >= len) {
      input.setSelectionRange(len - 1, len);
      return;
    }
    if (start > len) start = len;
    if (end > len) end = len;
    // Inside the typed region the caret always selects one character for
    // overwrite, like input-otp.
    if (start === end && start < len) {
      end = start + 1;
    }
    if (start !== input.selectionStart || end !== input.selectionEnd) {
      input.setSelectionRange(start, end);
    }
  }

  function render(root) {
    const input = inputOf(root);
    const slots = slotsOf(root);
    const value = input.value;
    const focused = document.activeElement === input;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    slots.forEach((slot, i) => {
      const charEl = slot.querySelector("[data-tui-inputotp-char]");
      if (charEl) charEl.textContent = value[i] || "";
      const caretEl = slot.querySelector("[data-tui-inputotp-caret]");
      let active = false;
      if (focused) {
        if (start === end) {
          active = i === Math.min(start, slots.length - 1);
        } else {
          active = i >= start && i < end;
        }
      }
      slot.setAttribute("data-active", active ? "true" : "false");
      const showCaret = focused && active && start === end && i >= value.length;
      if (caretEl) {
        caretEl.classList.toggle("hidden", !showCaret);
        caretEl.classList.toggle("flex", showCaret);
      }
      if (showCaret && charEl) charEl.textContent = "";
    });
  }

  function initRoot(root) {
    if (root.dataset.tuiInputotpInit === "true") return;
    root.dataset.tuiInputotpInit = "true";
    const input = inputOf(root);
    if (!input) return;
    input.maxLength = slotsOf(root).length;
    input.value = sanitize(root, input.value);
    render(root);
  }

  function init() {
    roots().forEach(initRoot);
  }

  document.addEventListener("input", (e) => {
    if (!(e.target instanceof Element) || !e.target.hasAttribute("data-tui-inputotp-input")) return;
    const root = e.target.closest("[data-tui-inputotp]");
    const clean = sanitize(root, e.target.value);
    if (clean !== e.target.value) {
      e.target.value = clean;
    }
    normalizeSelection(root);
    render(root);
  });

  document.addEventListener("focusin", (e) => {
    if (!(e.target instanceof Element) || !e.target.hasAttribute("data-tui-inputotp-input")) return;
    const input = e.target;
    const root = input.closest("[data-tui-inputotp]");
    forceEndSelection(root);
    render(root);
    // Chrome restores the previous caret position right after focus,
    // enforce the end selection once more on the next tick.
    setTimeout(() => {
      if (document.activeElement === input) {
        forceEndSelection(root);
        render(root);
      }
    }, 0);
  });

  // Arrow navigation moves the single-character selection like input-otp.
  document.addEventListener("keydown", (e) => {
    if (!(e.target instanceof Element) || !e.target.hasAttribute("data-tui-inputotp-input")) return;
    const input = e.target;
    const root = input.closest("[data-tui-inputotp]");
    const max = slotsOf(root).length;
    const len = input.value.length;
    const start = input.selectionStart || 0;
    let handled = true;
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      const i = Math.max(0, Math.min(start, len - 1) - (start > 0 && start >= len ? 0 : 1));
      if (len > 0) input.setSelectionRange(Math.max(0, Math.min(i, len - 1)), Math.max(0, Math.min(i, len - 1)) + 1);
    } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      const i = start + 1;
      if (i < len) {
        input.setSelectionRange(i, i + 1);
      } else if (len === max && max > 0) {
        input.setSelectionRange(len - 1, len);
      } else {
        input.setSelectionRange(len, len);
      }
    } else if (e.key === "Home") {
      if (len > 0) input.setSelectionRange(0, 1);
      else input.setSelectionRange(0, 0);
    } else if (e.key === "End") {
      forceEndSelection(root);
    } else {
      handled = false;
    }
    if (handled) {
      e.preventDefault();
      render(root);
    }
  });

  document.addEventListener("focusout", (e) => {
    if (!(e.target instanceof Element) || !e.target.hasAttribute("data-tui-inputotp-input")) return;
    render(e.target.closest("[data-tui-inputotp]"));
  });

  // Pointer presses always land on the invisible input; defer so the
  // browser's own caret placement is overridden.
  document.addEventListener("pointerup", (e) => {
    if (!(e.target instanceof Element) || !e.target.hasAttribute("data-tui-inputotp-input")) return;
    const root = e.target.closest("[data-tui-inputotp]");
    requestAnimationFrame(() => {
      forceEndSelection(root);
      render(root);
    });
  });

  document.addEventListener("selectionchange", () => {
    const el = document.activeElement;
    if (!(el instanceof Element) || !el.hasAttribute("data-tui-inputotp-input")) return;
    const root = el.closest("[data-tui-inputotp]");
    normalizeSelection(root);
    render(root);
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
  // Re-init on any childList mutation, directly (never rAF-deferred: rAF
  // does not fire in hidden tabs or throttled iframes): swapped-in markup
  // wires itself.
  new MutationObserver(() => init()).observe(document.body, { childList: true, subtree: true });
})();

// components/popover/popover.js
// Uses window.FloatingUIDOM from components/floatingui (loaded in the same bundle).
(function () {
  // Constants from Base UI's popover, shadcn's reference implementation.
  const EXIT_MS = 120; // exit animation (duration-100) + slack
  const COLLISION_PADDING = 5;

  const escapeTargets = new WeakSet();
  function listenForEscape(element) {
    if (!element || escapeTargets.has(element)) return;
    element.addEventListener("keydown", closeOnEscapeKeyDown);
    escapeTargets.add(element);
  }

  // useDismiss: popup/reference listeners stop Escape before outer document handlers.
  function closeOnEscapeKeyDown(event) {
    if (event.key !== "Escape") return;
    const contents = event.currentTarget === document
      ? allContents()
      : [event.currentTarget.hasAttribute("data-tui-popover-content")
        ? event.currentTarget
        : contentFor(event.currentTarget)];
    let handled = false;
    for (const content of contents) {
      if (!content?.hasAttribute("data-open")) continue;
      if (requestOpenChange(content, false)) event.preventDefault();
      event.stopPropagation();
      handled = true;
    }
    return handled;
  }

  function allContents() {
    return document.querySelectorAll("[data-tui-popover-content]");
  }

  function triggerFor(content) {
    return document.querySelector(
      '[data-tui-popover-trigger][aria-controls="' + content.id + '"]',
    );
  }

  function contentFor(trigger) {
    return document.getElementById(trigger.getAttribute("aria-controls"));
  }

  // Focus waits until after the input task:
  // Chromium's mousedown default focuses the trigger, WebKit's clears focus.
  // One frame, like Base UI, with a guard for a popup that closed meanwhile.
  function enqueueFocus(el, shouldFocus) {
    if (!el) return;
    requestAnimationFrame(() => {
      if (shouldFocus && !shouldFocus()) return;
      el.focus({ preventScroll: true });
    });
  }

  function popupFor(content) {
    return content.querySelector("[data-tui-popover-popup]");
  }

  function setState(content, state) {
    const open = state === "open";
    content.toggleAttribute("data-open", open);
    content.toggleAttribute("data-closed", !open);
    const popup = popupFor(content);
    if (popup) {
      popup.toggleAttribute("data-open", open);
      popup.toggleAttribute("data-closed", !open);
    }
  }

  function setTransitionAttribute(content, name, present) {
    content.toggleAttribute(name, present);
    const popup = popupFor(content);
    if (popup) popup.toggleAttribute(name, present);
  }

  function startTransition(content) {
    setTransitionAttribute(content, "data-ending-style", false);
    setTransitionAttribute(content, "data-starting-style", true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setTransitionAttribute(content, "data-starting-style", false));
    });
  }

  function setSide(content, side) {
    content.setAttribute("data-side", side);
    const popup = popupFor(content);
    if (popup) popup.setAttribute("data-side", side);
  }

  // Base UI zooms the popup out of the anchor's center point, not out of a
  // placement corner.
  function anchorOrigin(result, anchorRect, positionerRect, sideOffset) {
    const side = result.placement.split("-")[0];
    const centerX = anchorRect.left + anchorRect.width / 2 - positionerRect.left + "px";
    const centerY = anchorRect.top + anchorRect.height / 2 - positionerRect.top + "px";
    if (side === "bottom") return centerX + " " + -sideOffset + "px";
    if (side === "top") return centerX + " calc(100% + " + sideOffset + "px)";
    if (side === "right") return -sideOffset + "px " + centerY;
    return "calc(100% + " + sideOffset + "px) " + centerY;
  }

  // Moves the content to <body> (shadcn portals it the same way).
  // The unmount half of the React portal pendant: a portaled content lives
  // as long as its SSR declaration site (_tuiPortalOwner) stays in the
  // document. Trigger-presence heuristics judged mid-swap moments wrongly -
  // multi-phase swap layers briefly disconnect the new triggers.
  function removeOrphanedContents(content) {
    document.querySelectorAll("body > [data-tui-popover-content]").forEach((c) => {
      if (c !== content && c._tuiPortalOwner && !c._tuiPortalOwner.isConnected) {
        stopAutoPositioning(c);
        c.remove();
      }
    });
  }

  function portal(content) {
    listenForEscape(content);
    removeOrphanedContents(content);
    if (content.parentElement !== document.body) {
      if (!content._tuiPortalOwner) content._tuiPortalOwner = content.parentElement;
      document.body.appendChild(content);
    }
    wireAria(content);
  }

  // Base UI links Title/Description to the popup via aria-labelledby and
  // aria-describedby with generated ids.
  function wireAria(content) {
    const popup = popupFor(content);
    if (!popup) return;
    const title = popup.querySelector("[data-slot=popover-title]");
    if (title) {
      if (!title.id) title.id = content.id + "-title";
      popup.setAttribute("aria-labelledby", title.id);
    }
    const description = popup.querySelector("[data-slot=popover-description]");
    if (description) {
      if (!description.id) description.id = content.id + "-description";
      popup.setAttribute("aria-describedby", description.id);
    }
  }

  function position(content) {
    const trigger = triggerFor(content);
    if (!trigger) return Promise.resolve();
    const { computePosition, offset, flip, shift } = window.FloatingUIDOM;
    const side = content.getAttribute("data-tui-popover-side") || "bottom";
    const align = content.getAttribute("data-tui-popover-align") || "center";
    const sideOffset = parseFloat(content.getAttribute("data-tui-popover-side-offset")) || 0;
    const alignOffset = parseFloat(content.getAttribute("data-tui-popover-align-offset")) || 0;
    const placement = align === "center" ? side : side + "-" + align;

    return computePosition(trigger, content, {
      placement: placement,
      strategy: "absolute",
      middleware: [
        offset({ mainAxis: sideOffset, crossAxis: alignOffset }),
        flip({ padding: COLLISION_PADDING }),
        shift({ padding: COLLISION_PADDING }),
      ],
    }).then((result) => {
      content.style.left = result.x + "px";
      content.style.top = result.y + "px";
      setSide(content, result.placement.split("-")[0]);
      const popup = popupFor(content);
      if (popup) {
        popup.style.setProperty(
          "--transform-origin",
          anchorOrigin(
            result,
            trigger.getBoundingClientRect(),
            content.getBoundingClientRect(),
            sideOffset,
          ),
        );
      }
    });
  }

  function startAutoPositioning(content) {
    const trigger = triggerFor(content);
    if (!trigger) return Promise.resolve();
    if (content._tuiPositionCleanup) content._tuiPositionCleanup();
    let resolveFirst;
    const firstPosition = new Promise((resolve) => {
      resolveFirst = resolve;
    });
    const update = () => position(content).then(resolveFirst, resolveFirst);
    content._tuiPositionCleanup = window.FloatingUIDOM.autoUpdate(trigger, content, update, {
      elementResize: typeof ResizeObserver !== "undefined",
      layoutShift: typeof IntersectionObserver !== "undefined",
    });
    return firstPosition;
  }

  function stopAutoPositioning(content) {
    if (!content._tuiPositionCleanup) return;
    content._tuiPositionCleanup();
    content._tuiPositionCleanup = null;
  }

  function isOpen(content) {
    return content.hasAttribute("data-open");
  }

  function requestOpenChange(content, nextOpen, returnFocus) {
    if (!content || isOpen(content) === nextOpen) return false;
    const accepted = content.dispatchEvent(
      new CustomEvent("popover-open-change", {
        bubbles: true,
        cancelable: true,
        detail: { open: nextOpen },
      }),
    );
    if (!accepted || content.hasAttribute("data-tui-popover-controlled")) return false;
    if (nextOpen) open(content);
    else close(content, returnFocus);
    return true;
  }

  function open(content) {
    if (typeof content === "string") content = document.getElementById(content);
    if (!content || isOpen(content)) return;
    allContents().forEach((c) => {
      if (c !== content) close(c);
    });
    clearTimeout(content._tuiHide);
    portal(content);
    // z-index portal like shadcn (no native top layer); re-append
    // keeps paint order = open order.
    document.body.appendChild(content);
    content.hidden = false;

    // Position it invisibly first, then play the enter animation in place.
    content.style.visibility = "hidden";
    const finish = () => {
      // duration-100 transitions `all`; a visibility transition would
      // freeze at hidden in background tabs - flip suppressed.
      const popup = popupFor(content);
      content.style.transitionProperty = "none";
      if (popup) popup.style.transitionProperty = "none";
      content.style.visibility = "";
      void content.offsetWidth;
      content.style.transitionProperty = "";
      if (popup) popup.style.transitionProperty = "";
      if (content.hidden) return;
      setState(content, "open");
      startTransition(content);
      const trigger = triggerFor(content);
      if (trigger) {
        trigger.setAttribute("aria-expanded", "true");
        trigger.setAttribute("data-popup-open", "");
        trigger.setAttribute("data-pressed", "");
      }
      // Base UI moves focus into the popup when it opens.
      if (popup && !content.contains(document.activeElement)) {
        enqueueFocus(popup, () => isOpen(content));
      }
    };
    startAutoPositioning(content).then(finish, finish);
  }

  // returnFocus false skips the focus restore, like Base UI on pointer
  // dismiss: focus follows the outside press instead of the trigger.
  function close(content, returnFocus) {
    if (typeof content === "string") content = document.getElementById(content);
    if (!content || content.hidden) return;
    stopAutoPositioning(content);
    if (returnFocus !== false && content.contains(document.activeElement)) {
      const focusTrigger = triggerFor(content);
      if (focusTrigger) focusTrigger.focus({ preventScroll: true });
    }
    content.style.visibility = "";
    setTransitionAttribute(content, "data-starting-style", false);
    setState(content, "closed");
    setTransitionAttribute(content, "data-ending-style", true);
    const trigger = triggerFor(content);
    if (trigger) {
      trigger.setAttribute("aria-expanded", "false");
      trigger.removeAttribute("data-popup-open");
      trigger.removeAttribute("data-pressed");
    }
    clearTimeout(content._tuiHide);
    content._tuiHide = setTimeout(() => {
      if (content.hasAttribute("data-closed") && !content.hidden) {
        content.hidden = true;
        setTransitionAttribute(content, "data-ending-style", false);
      }
    }, EXIT_MS);
  }

  function closeAll(returnFocus) {
    allContents().forEach((content) => close(content, returnFocus));
  }

  function requestCloseAll(returnFocus) {
    allContents().forEach((content) => requestOpenChange(content, false, returnFocus));
  }

  function closeNearest(element) {
    if (!element) return;
    const content =
      element.closest?.("[data-tui-popover-content]") ||
      (element.closest?.("[data-tui-popover-trigger]") &&
        contentFor(element.closest("[data-tui-popover-trigger]"))) ||
      element.querySelector?.("[data-tui-popover-content]");
    if (content) requestOpenChange(content, false);
  }

  function toggle(content) {
    if (typeof content === "string") content = document.getElementById(content);
    if (!content) return;
    requestOpenChange(content, !isOpen(content));
  }

  // Pointer interactions toggle and dismiss on PRESS, exactly like Base UI.
  // Click is never used for open/close, so the stray click the browser fires
  // on body when the popup ends up under the released pointer is harmless.
  document.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 || !(e.target instanceof Element)) return;
    const trigger = e.target.closest("[data-tui-popover-trigger]");
    if (trigger) {
      if (trigger.disabled) return;
      const content = contentFor(trigger);
      if (content) toggle(content);
      return;
    }
    if (!e.target.closest("[data-tui-popover-content]")) requestCloseAll(false);
  });

  document.addEventListener("click", (e) => {
    if (!(e.target instanceof Element)) return;
    const trigger = e.target.closest("[data-tui-popover-trigger]");
    if (trigger) {
      // Keyboard activation only (Enter/Space fire a detail-0 click without
      // a preceding pointerdown); pointer presses are handled on pointerdown.
      if (e.detail === 0 && !trigger.disabled) {
        const content = contentFor(trigger);
        if (content) toggle(content);
      }
    }
  });

  document.addEventListener("keydown", closeOnEscapeKeyDown);


  // Content stays in its hidden portal node until it opens.
  function init() {
    removeOrphanedContents();
    document.querySelectorAll("[data-tui-popover-trigger]").forEach(listenForEscape);
    allContents().forEach((content) => {
      if (!triggerFor(content)) return;
      if (content.getAttribute("data-tui-popover-initial-open") === "true") {
        content.removeAttribute("data-tui-popover-initial-open");
        open(content);
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
  // Re-init on any childList mutation, directly (never rAF-deferred: rAF
  // does not fire in hidden tabs or throttled iframes): swapped-in markup
  // wires itself, removals release portaled content through the
  // ownership sweep.
  new MutationObserver(() => init()).observe(document.body, { childList: true, subtree: true });

  window.tui = window.tui || {};
  window.tui.popover = {
    open,
    close,
    closeAll,
    closeNearest,
    toggle,
    isOpen: (c) => {
      if (typeof c === "string") c = document.getElementById(c);
      return !!c && isOpen(c);
    },
  };
})();

// components/progress/progress.js
(function () {
  'use strict';

  // Pendant of Base UI's status state: data-complete once value reaches max,
  // data-progressing otherwise, mirrored onto the root and every part.
  function setStatus(el, complete) {
    el.removeAttribute(complete ? 'data-progressing' : 'data-complete');
    el.setAttribute(complete ? 'data-complete' : 'data-progressing', '');
  }

  function updateProgress(progressBar) {
    const indicator = progressBar.querySelector('[data-tui-progress-indicator]');
    if (!indicator) return;

    const value = parseFloat(progressBar.getAttribute('aria-valuenow') || '0');
    const max = parseFloat(progressBar.getAttribute('aria-valuemax') || '100') || 100;
    const percentage = Math.max(0, Math.min(100, (value / max) * 100));

    indicator.style.width = percentage + '%';
    progressBar.setAttribute('aria-valuetext', Math.round(percentage) + '%');

    const complete = value >= max;
    setStatus(progressBar, complete);
    progressBar
      .querySelectorAll('[data-tui-progress-part]')
      .forEach((part) => setStatus(part, complete));

    const valueEl = progressBar.querySelector('[data-slot="progress-value"]');
    if (valueEl) valueEl.textContent = Math.round(percentage) + '%';
  }

  // One shared observer translates aria-valuenow/aria-valuemax changes into
  // indicator width, value text, aria-valuetext and status attributes.
  const attrObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => updateProgress(mutation.target));
  });

  function observeBar(bar) {
    if (bar.hasAttribute('data-tui-progress-observed')) return;
    bar.setAttribute('data-tui-progress-observed', 'true');

    // Pendant of Base UI's label registration: a Label child links itself to
    // the root via aria-labelledby.
    const label = bar.querySelector('[data-slot="progress-label"]');
    if (label && label.id && !bar.hasAttribute('aria-labelledby')) {
      bar.setAttribute('aria-labelledby', label.id);
    }

    updateProgress(bar);
    attrObserver.observe(bar, {
      attributes: true,
      attributeFilter: ['aria-valuenow', 'aria-valuemax'],
    });
  }

  // Bars present at load register immediately; bars swapped in later (e.g.
  // htmx) register via the childList observer.
  function init() {
    document.querySelectorAll('[role="progressbar"]').forEach(observeBar);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  // Re-init on any childList mutation, directly (never rAF-deferred: rAF
  // does not fire in hidden tabs or throttled iframes): swapped-in markup
  // wires itself.
  new MutationObserver(() => init()).observe(document.body, { childList: true, subtree: true });
})();

// components/radiogroup/radiogroup.js
(function () {
  "use strict";

  // Vanilla port of Base UI's radio group: the item behavior comes from
  // radio/root/RadioRoot.tsx, the group behavior from
  // radio-group/RadioGroup.tsx and the arrow-key navigation with roving tab
  // stop from internals/composite/root/useCompositeRoot.ts (orientation
  // "both", loopFocus, Home/End disabled, Shift is the only modifier that
  // does not cancel navigation). Clicks and Space forward to the visually
  // hidden native radio beside the item; arrow keys move the focus and select
  // the focused item (RadioGroup marks arrow navigation as touched, the
  // focused radio then clicks its hidden input).

  function inputOf(item) {
    const next = item.nextElementSibling;
    return next && next.matches("[data-tui-radio-input]") ? next : null;
  }

  function itemOf(input) {
    const prev = input.previousElementSibling;
    return prev && prev.matches("[data-tui-radio-group-item]") ? prev : null;
  }

  function itemsOf(group) {
    return Array.from(group.querySelectorAll("[data-tui-radio-group-item]"));
  }

  function isDisabled(item, input) {
    return (input && input.disabled) || item.getAttribute("aria-disabled") === "true";
  }

  function isReadOnly(item) {
    return item.getAttribute("aria-readonly") === "true";
  }

  function groupOf(input) {
    return input.closest("[data-tui-radio-group]");
  }

  function requestValueChange(input) {
    const group = groupOf(input);
    if (input.checked) return true;
    const change = new CustomEvent(group ? "radio-group-value-change" : "radio-checked-change", {
      bubbles: true,
      cancelable: true,
      detail: group ? { value: input.value } : { checked: true },
    });
    const target = group || itemOf(input);
    const accepted = target.dispatchEvent(change);
    const controlled = group
      ? group.hasAttribute("data-tui-radio-group-controlled")
      : target.hasAttribute("data-tui-radio-controlled");
    return accepted && !controlled;
  }

  // Port of utils/dispatchClickWithModifiers.ts: the constructed click keeps
  // the source event's modifier state and still runs native activation
  // behavior (selecting the radio).
  function forwardClick(target, sourceEvent) {
    target.dispatchEvent(
      new PointerEvent("click", {
        bubbles: true,
        cancelable: true,
        composed: true,
        detail: 0,
        shiftKey: sourceEvent.shiftKey,
        ctrlKey: sourceEvent.ctrlKey,
        altKey: sourceEvent.altKey,
        metaKey: sourceEvent.metaKey,
      }),
    );
  }

  function syncItem(item, input) {
    const checked = !!input && input.checked;
    item.setAttribute("aria-checked", String(checked));
    item.toggleAttribute("data-checked", checked);
    item.toggleAttribute("data-unchecked", !checked);
    const indicator = item.querySelector('[data-slot="radio-group-indicator"]');
    if (indicator) {
      // Base UI unmounts the indicator while unchecked; we toggle [hidden].
      indicator.hidden = !checked;
      indicator.toggleAttribute("data-checked", checked);
      indicator.toggleAttribute("data-unchecked", !checked);
    }
    return checked;
  }

  function syncGroup(group) {
    const items = itemsOf(group);
    let stop = null;
    items.forEach((item) => {
      if (syncItem(item, inputOf(item))) stop = item;
    });
    // Roving tab stop (useCompositeRoot onMapChange): the checked item is the
    // group's tab stop, otherwise the first enabled item.
    if (!stop) stop = items.find((item) => !isDisabled(item, inputOf(item))) || null;
    items.forEach((item) => {
      item.setAttribute("tabindex", item === stop ? "0" : "-1");
    });
  }

  function syncByInput(input) {
    // The browser already unchecked the same-name siblings without firing
    // change events on them, so the whole group resyncs.
    const group = groupOf(input);
    if (group) {
      syncGroup(group);
    } else {
      const item = itemOf(input);
      if (item) syncItem(item, input);
    }
  }

  // RadioRoot onClick: cancel the click's default (a wrapping label would
  // otherwise forward it to the input a second time) and select through the
  // hidden input so the native change event fires.
  document.addEventListener("click", (e) => {
    const item = e.target.closest && e.target.closest("[data-tui-radio-group-item]");
    if (!item || e.defaultPrevented) return;
    const input = inputOf(item);
    if (!input) return;
    if (isDisabled(item, input)) {
      // useButton prevents clicks on disabled non-native buttons.
      e.preventDefault();
      return;
    }
    if (isReadOnly(item)) return;
    e.preventDefault();
    forwardClick(input, e);
  });

  document.addEventListener("change", (e) => {
    const input = e.target;
    if (!input.matches || !input.matches("[data-tui-radio-input]")) return;
    syncByInput(input);
  });

  document.addEventListener("keydown", (e) => {
    const item = e.target;
    if (!item.matches || !item.matches("[data-tui-radio-group-item]")) return;
    const input = inputOf(item);
    if (isDisabled(item, input)) return;
    if (e.key === "Enter") {
      // RadioRoot onKeyDown: a radio only activates with Space.
      e.preventDefault();
      return;
    }
    if (e.key === " ") {
      // useButton: composite items activate Space on keydown.
      e.preventDefault();
      if (input && !isReadOnly(item)) forwardClick(input, e);
      return;
    }
    if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) return;
    // isModifierKeySet with modifierKeys=[Shift]: any other modifier cancels.
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    const group = item.closest("[data-tui-radio-group]");
    if (!group) return;
    const rtl = getComputedStyle(group).direction === "rtl";
    const forward = e.key === "ArrowDown" || e.key === (rtl ? "ArrowLeft" : "ArrowRight");
    const items = itemsOf(group);
    const enabled = items.filter((it) => !isDisabled(it, inputOf(it)));
    if (enabled.length === 0) return;
    e.preventDefault();
    let next = enabled.indexOf(item) + (forward ? 1 : -1);
    // loopFocus wraps around at both ends.
    if (next < 0) next = enabled.length - 1;
    if (next >= enabled.length) next = 0;
    const nextItem = enabled[next];
    if (nextItem === item) return;
    // The highlight (and with it the tab stop) follows the arrow navigation.
    items.forEach((it) => {
      it.setAttribute("tabindex", it === nextItem ? "0" : "-1");
    });
    nextItem.focus();
    // RadioGroup onKeyDownCapture marks arrow navigation as touched; the
    // focused radio's onFocus then clicks its hidden input, selecting it.
    const nextInput = inputOf(nextItem);
    if (nextInput && !isReadOnly(nextItem)) forwardClick(nextInput, e);
  });

  // Focus on the hidden input (label clicks, programmatic focus) belongs on
  // the item root (RadioRoot's input onFocus).
  document.addEventListener("focusin", (e) => {
    const input = e.target;
    if (!input.matches || !input.matches("[data-tui-radio-input]")) return;
    const item = itemOf(input);
    if (item) item.focus();
  });

  let labelId = 0;

  function setupItem(item) {
    if (item.hasAttribute("data-tui-radio-initialized")) return;
    item.setAttribute("data-tui-radio-initialized", "");
    const input = inputOf(item);
    if (!input) return;
    // The clicks dispatched on the hidden input are an implementation detail
    // and must not reach ancestors, which already receive the original click
    // (RadioRoot's input onClick).
    input.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!requestValueChange(input)) e.preventDefault();
    });
    // useAriaLabelledBy fallback: the span control is labelled by the native
    // label associated with the hidden input.
    if (!item.hasAttribute("aria-labelledby") && !item.hasAttribute("aria-label")) {
      const label =
        input.parentElement && input.parentElement.tagName === "LABEL"
          ? input.parentElement
          : input.labels && input.labels[0];
      if (label) {
        if (!label.id) {
          labelId += 1;
          label.id = (input.id || "tui-radio-" + labelId) + "-label";
        }
        item.setAttribute("aria-labelledby", label.id);
      }
    }
  }

  function init() {
    document.querySelectorAll("[data-tui-radio-group-item]").forEach(setupItem);
    document.querySelectorAll("[data-tui-radio-group]").forEach((group) => {
      if (group.hasAttribute("data-tui-radio-group-initialized")) return;
      group.setAttribute("data-tui-radio-group-initialized", "");
      syncGroup(group);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
  // Re-init on any childList mutation, directly (never rAF-deferred: rAF
  // does not fire in hidden tabs or throttled iframes): swapped-in markup
  // wires itself.
  new MutationObserver(() => init()).observe(document.body, { childList: true, subtree: true });
})();

// components/resizable/resizable.js
/*
 * Layout and interaction behavior ported from react-resizable-panels.
 * UI behavior baseline: 4.5.8 (the version resolved by shadcn/ui).
 * The MIT License (MIT), Copyright (c) 2018 Brian Vaughn.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
(function () {
  "use strict";

  const GROUP = "[data-tui-resizable-group]";
  const PANEL = "[data-tui-resizable-panel]";
  const HANDLE = "[data-tui-resizable-handle]";
  const CURSOR_FLAG_HORIZONTAL_MIN = 0b0001;
  const CURSOR_FLAG_HORIZONTAL_MAX = 0b0010;
  const CURSOR_FLAG_VERTICAL_MIN = 0b0100;
  const CURSOR_FLAG_VERTICAL_MAX = 0b1000;
  const CURSOR_FLAGS_HORIZONTAL = 0b0011;
  const CURSOR_FLAGS_VERTICAL = 0b1100;
  const mounted = new Map();
  const byElement = new WeakMap();
  let interaction = { state: "inactive", hitRegions: [], cursorFlags: 0 };
  let cursorStyleElement = null;
  let coarsePointer;
  let advancedCursorStyles;

  function formatLayoutNumber(number) {
    return Number.parseFloat(number.toFixed(3));
  }

  function layoutNumbersEqual(actual, expected, minimumDelta = 0) {
    return Math.abs(formatLayoutNumber(actual) - formatLayoutNumber(expected)) <= minimumDelta;
  }

  function compareLayoutNumbers(actual, expected) {
    return layoutNumbersEqual(actual, expected) ? 0 : actual > expected ? 1 : -1;
  }

  function layoutsEqual(a, b) {
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    return aKeys.length === bKeys.length && aKeys.every((key) =>
      Object.prototype.hasOwnProperty.call(b, key) && layoutNumbersEqual(a[key], b[key]));
  }

  function arraysEqual(a, b) {
    return a.length === b.length && a.every((value, index) => layoutNumbersEqual(value, b[index]));
  }

  function orientationOf(group) {
    return group.dataset.orientation === "vertical" ? "vertical" : "horizontal";
  }

  function directChildren(group, selector) {
    return [...group.children].filter((element) => element.matches(selector));
  }

  function sortByElementOffset(orientation, records) {
    return [...records].sort((a, b) => {
      if (orientation === "horizontal") {
        return a.element.offsetLeft - b.element.offsetLeft || a.element.offsetWidth - b.element.offsetWidth;
      }
      return a.element.offsetTop - b.element.offsetTop || a.element.offsetHeight - b.element.offsetHeight;
    });
  }

  function calculateAvailableGroupSize(state) {
    return state.panels.reduce((total, panel) => total +
      (state.orientation === "horizontal" ? panel.element.offsetWidth : panel.element.offsetHeight), 0);
  }

  function parseSizeAndUnit(size) {
    if (typeof size === "number") return [size, "px"];
    const numeric = Number.parseFloat(size);
    if (size.endsWith("%")) return [numeric, "%"];
    if (size.endsWith("px")) return [numeric, "px"];
    if (size.endsWith("rem")) return [numeric, "rem"];
    if (size.endsWith("em")) return [numeric, "em"];
    if (size.endsWith("vh")) return [numeric, "vh"];
    if (size.endsWith("vw")) return [numeric, "vw"];
    return [numeric, "%"];
  }

  function sizeStyleToPixels(state, panel, styleProp) {
    const groupSize = calculateAvailableGroupSize(state);
    const [size, unit] = parseSizeAndUnit(styleProp);
    const view = panel.element.ownerDocument.defaultView || window;
    switch (unit) {
      case "%": return (size / 100) * groupSize;
      case "px": return size;
      case "rem": return size * Number.parseFloat(view.getComputedStyle(panel.element.ownerDocument.documentElement).fontSize);
      case "em": return size * Number.parseFloat(view.getComputedStyle(panel.element).fontSize);
      case "vh": return (size / 100) * view.innerHeight;
      case "vw": return (size / 100) * view.innerWidth;
      default: return 0;
    }
  }

  function calculatePanelConstraints(state) {
    const groupSize = calculateAvailableGroupSize(state);
    if (groupSize === 0) {
      return state.panels.map((panel) => ({
        panelId: panel.id,
        groupResizeBehavior: panel.raw.groupResizeBehavior,
        collapsedSize: 0,
        collapsible: panel.raw.collapsible,
        defaultSize: undefined,
        disabled: panel.raw.disabled,
        minSize: 0,
        maxSize: 100,
      }));
    }
    const percentage = (panel, value, fallback) => value === undefined
      ? fallback
      : formatLayoutNumber((sizeStyleToPixels(state, panel, value) / groupSize) * 100);
    return state.panels.map((panel) => ({
      panelId: panel.id,
      groupResizeBehavior: panel.raw.groupResizeBehavior,
      collapsedSize: percentage(panel, panel.raw.collapsedSize, 0),
      collapsible: panel.raw.collapsible,
      defaultSize: percentage(panel, panel.raw.defaultSize, undefined),
      disabled: panel.raw.disabled,
      minSize: percentage(panel, panel.raw.minSize, 0),
      maxSize: percentage(panel, panel.raw.maxSize, 100),
    }));
  }

  function calculateDefaultLayout(constraints) {
    let explicitCount = 0;
    let total = 0;
    const layout = {};
    for (const current of constraints) {
      if (current.defaultSize !== undefined) {
        explicitCount++;
        const size = formatLayoutNumber(current.defaultSize);
        total += size;
        layout[current.panelId] = size;
      } else {
        layout[current.panelId] = undefined;
      }
    }
    const remaining = constraints.length - explicitCount;
    if (remaining !== 0) {
      const size = formatLayoutNumber((100 - total) / remaining);
      for (const current of constraints) {
        if (current.defaultSize === undefined) layout[current.panelId] = size;
      }
    }
    return layout;
  }

  function validatePanelSize({ overrideDisabledPanels = false, panelConstraints, prevSize, size }) {
    const collapsedSize = panelConstraints.collapsedSize ?? 0;
    const minSize = panelConstraints.minSize ?? 0;
    const maxSize = panelConstraints.maxSize ?? 100;
    if (panelConstraints.disabled && !overrideDisabledPanels) return prevSize;
    if (compareLayoutNumbers(size, minSize) < 0) {
      if (panelConstraints.collapsible) {
        const halfwayPoint = (collapsedSize + minSize) / 2;
        size = compareLayoutNumbers(size, halfwayPoint) < 0 ? collapsedSize : minSize;
      } else {
        size = minSize;
      }
    }
    return formatLayoutNumber(Math.min(maxSize, size));
  }

  function validatePanelGroupLayout(layout, constraints) {
    const keys = Object.keys(layout);
    const prevLayout = Object.values(layout);
    const nextLayout = [...prevLayout];
    const total = nextLayout.reduce((sum, current) => sum + current, 0);
    if (nextLayout.length !== constraints.length) {
      throw new Error(`Invalid ${constraints.length} panel layout`);
    }
    if (!layoutNumbersEqual(total, 100) && nextLayout.length > 0) {
      for (let index = 0; index < constraints.length; index++) {
        nextLayout[index] = (100 / total) * nextLayout[index];
      }
    }
    let remainingSize = 0;
    for (let index = 0; index < constraints.length; index++) {
      const unsafeSize = nextLayout[index];
      const safeSize = validatePanelSize({
        overrideDisabledPanels: true,
        panelConstraints: constraints[index],
        prevSize: prevLayout[index],
        size: unsafeSize,
      });
      if (unsafeSize !== safeSize) {
        remainingSize += unsafeSize - safeSize;
        nextLayout[index] = safeSize;
      }
    }
    if (!layoutNumbersEqual(remainingSize, 0)) {
      for (let index = 0; index < constraints.length; index++) {
        const prevSize = nextLayout[index];
        const safeSize = validatePanelSize({
          overrideDisabledPanels: true,
          panelConstraints: constraints[index],
          prevSize,
          size: prevSize + remainingSize,
        });
        if (prevSize !== safeSize) {
          remainingSize -= safeSize - prevSize;
          nextLayout[index] = safeSize;
          if (layoutNumbersEqual(remainingSize, 0)) break;
        }
      }
    }
    return nextLayout.reduce((result, current, index) => {
      result[keys[index]] = current;
      return result;
    }, {});
  }

  // Direct port of react-resizable-panels adjustLayoutByDelta.
  function adjustLayoutByDelta({ delta, initialLayout: initialObject, panelConstraints, pivotIndices, prevLayout: prevObject, trigger }) {
    if (layoutNumbersEqual(delta, 0)) return initialObject;
    const overrideDisabledPanels = trigger === "imperative-api";
    const initialLayout = Object.values(initialObject);
    const prevLayout = Object.values(prevObject);
    const nextLayout = [...initialLayout];
    const [firstPivotIndex, secondPivotIndex] = pivotIndices;
    let deltaApplied = 0;

    if (trigger === "keyboard") {
      let index = delta < 0 ? secondPivotIndex : firstPivotIndex;
      let c = panelConstraints[index];
      if (c?.collapsible && layoutNumbersEqual(initialLayout[index], c.collapsedSize ?? 0)) {
        const localDelta = (c.minSize ?? 0) - initialLayout[index];
        if (compareLayoutNumbers(localDelta, Math.abs(delta)) > 0) delta = delta < 0 ? -localDelta : localDelta;
      }
      index = delta < 0 ? firstPivotIndex : secondPivotIndex;
      c = panelConstraints[index];
      if (c?.collapsible && layoutNumbersEqual(initialLayout[index], c.minSize ?? 0)) {
        const localDelta = initialLayout[index] - (c.collapsedSize ?? 0);
        if (compareLayoutNumbers(localDelta, Math.abs(delta)) > 0) delta = delta < 0 ? -localDelta : localDelta;
      }
    } else {
      const index = delta < 0 ? secondPivotIndex : firstPivotIndex;
      const c = panelConstraints[index];
      const prevSize = initialLayout[index];
      if (c?.collapsible && compareLayoutNumbers(prevSize, c.minSize) < 0) {
        const gapSize = c.minSize - c.collapsedSize;
        if (delta > 0) {
          const nextSize = prevSize + delta;
          if (compareLayoutNumbers(nextSize, c.minSize) < 0) {
            delta = compareLayoutNumbers(delta, gapSize / 2) <= 0 ? 0 : gapSize;
          }
        } else {
          const nextSize = prevSize - delta;
          if (compareLayoutNumbers(nextSize, c.minSize) < 0) {
            delta = compareLayoutNumbers(100 + delta, 100 - gapSize / 2) > 0 ? 0 : -gapSize;
          }
        }
      }
    }

    {
      const increment = delta < 0 ? 1 : -1;
      let index = delta < 0 ? secondPivotIndex : firstPivotIndex;
      let maxAvailableDelta = 0;
      while (index >= 0 && index < panelConstraints.length) {
        const prevSize = initialLayout[index];
        const maxSafeSize = validatePanelSize({
          overrideDisabledPanels,
          panelConstraints: panelConstraints[index],
          prevSize,
          size: 100,
        });
        maxAvailableDelta += maxSafeSize - prevSize;
        index += increment;
      }
      const minAbsDelta = Math.min(Math.abs(delta), Math.abs(maxAvailableDelta));
      delta = delta < 0 ? -minAbsDelta : minAbsDelta;
    }

    {
      let index = delta < 0 ? firstPivotIndex : secondPivotIndex;
      while (index >= 0 && index < panelConstraints.length) {
        const deltaRemaining = Math.abs(delta) - Math.abs(deltaApplied);
        const prevSize = initialLayout[index];
        const safeSize = validatePanelSize({
          overrideDisabledPanels,
          panelConstraints: panelConstraints[index],
          prevSize,
          size: prevSize - deltaRemaining,
        });
        if (!layoutNumbersEqual(prevSize, safeSize)) {
          deltaApplied += prevSize - safeSize;
          nextLayout[index] = safeSize;
          if (compareLayoutNumbers(deltaApplied, Math.abs(delta)) >= 0) break;
        }
        index += delta < 0 ? -1 : 1;
      }
    }

    if (arraysEqual(prevLayout, nextLayout)) return prevObject;

    {
      const pivotIndex = delta < 0 ? secondPivotIndex : firstPivotIndex;
      const prevSize = initialLayout[pivotIndex];
      const unsafeSize = prevSize + deltaApplied;
      const safeSize = validatePanelSize({
        overrideDisabledPanels,
        panelConstraints: panelConstraints[pivotIndex],
        prevSize,
        size: unsafeSize,
      });
      nextLayout[pivotIndex] = safeSize;
      if (!layoutNumbersEqual(safeSize, unsafeSize)) {
        let deltaRemaining = unsafeSize - safeSize;
        let index = pivotIndex;
        while (index >= 0 && index < panelConstraints.length) {
          const current = nextLayout[index];
          const next = validatePanelSize({
            overrideDisabledPanels,
            panelConstraints: panelConstraints[index],
            prevSize: current,
            size: current + deltaRemaining,
          });
          if (!layoutNumbersEqual(current, next)) {
            deltaRemaining -= next - current;
            nextLayout[index] = next;
          }
          if (layoutNumbersEqual(deltaRemaining, 0)) break;
          index += delta > 0 ? -1 : 1;
        }
      }
    }

    const total = nextLayout.reduce((sum, size) => sum + size, 0);
    if (!layoutNumbersEqual(total, 100, 0.1)) return prevObject;
    const keys = Object.keys(prevObject);
    return nextLayout.reduce((result, current, index) => {
      result[keys[index]] = current;
      return result;
    }, {});
  }

  function preserveFixedPanelSizes(state, nextGroupSize, prevGroupSize, prevLayout) {
    if (prevGroupSize <= 0 || nextGroupSize <= 0 || prevGroupSize === nextGroupSize) return prevLayout;
    let fixedTotal = 0;
    let flexiblePrevTotal = 0;
    let hasFixed = false;
    const fixed = new Map();
    const flexible = [];
    for (const panel of state.panels) {
      const prev = prevLayout[panel.id] ?? 0;
      if (panel.raw.groupResizeBehavior === "preserve-pixel-size") {
        hasFixed = true;
        const next = formatLayoutNumber((((prev / 100) * prevGroupSize) / nextGroupSize) * 100);
        fixed.set(panel.id, next);
        fixedTotal += next;
      } else {
        flexible.push(panel.id);
        flexiblePrevTotal += prev;
      }
    }
    if (!hasFixed || flexible.length === 0) return prevLayout;
    const remaining = 100 - fixedTotal;
    const nextLayout = { ...prevLayout };
    fixed.forEach((size, id) => { nextLayout[id] = size; });
    for (const id of flexible) {
      nextLayout[id] = flexiblePrevTotal > 0
        ? formatLayoutNumber((prevLayout[id] / flexiblePrevTotal) * remaining)
        : formatLayoutNumber(remaining / flexible.length);
    }
    return nextLayout;
  }

  function panelRecord(element) {
    return {
      element,
      id: element.id,
      expandToSize: undefined,
      prevSize: undefined,
      raw: {
        collapsedSize: element.dataset.collapsedSize || "0%",
        collapsible: element.hasAttribute("data-collapsible"),
        defaultSize: element.dataset.defaultSize,
        disabled: element.hasAttribute("data-disabled"),
        groupResizeBehavior: element.dataset.groupResizeBehavior || "preserve-relative-size",
        maxSize: element.dataset.maxSize || "100%",
        minSize: element.dataset.minSize || "0%",
      },
    };
  }

  function separatorRecord(element) {
    return {
      element,
      id: element.id,
      disabled: element.getAttribute("aria-disabled") === "true",
      disableDoubleClick: element.hasAttribute("data-disable-double-click"),
    };
  }

  function parseDefaultLayout(group) {
    if (!group.dataset.defaultLayout) return undefined;
    try { return JSON.parse(group.dataset.defaultLayout); } catch (_) { return undefined; }
  }

  function stateFor(group) {
    if (!group) return null;
    let state = byElement.get(group);
    const panelElements = directChildren(group, PANEL);
    const separatorElements = directChildren(group, HANDLE);
    const signature = panelElements.map((element) => element.id).join(",") + "|" + separatorElements.map((element) => element.id).join(",");
    if (state?.signature === signature) return state;
    if (state) unmount(state);
    const orientation = orientationOf(group);
    state = {
      element: group,
      id: group.id,
      orientation,
      disabled: group.hasAttribute("data-disabled"),
      disableCursor: group.hasAttribute("data-disable-cursor"),
      resizeTargetMinimumSize: {
        coarse: Number.parseFloat(group.dataset.resizeTargetCoarse) || 20,
        fine: Number.parseFloat(group.dataset.resizeTargetFine) || 10,
      },
      panels: sortByElementOffset(orientation, panelElements.map(panelRecord)),
      separators: sortByElementOffset(orientation, separatorElements.map(separatorRecord)),
      expandedPanelSizes: {},
      signature,
      resizeObserver: null,
    };
    state.groupSize = calculateAvailableGroupSize(state);
    state.constraints = calculatePanelConstraints(state);
    const incoming = parseDefaultLayout(group);
    const validIncoming = incoming && Object.keys(incoming).length === state.panels.length && state.panels.every((panel) => incoming[panel.id] !== undefined);
    const unsafe = validIncoming ? state.panels.reduce((layout, panel) => {
      layout[panel.id] = incoming[panel.id]; return layout;
    }, {}) : calculateDefaultLayout(state.constraints);
    state.layout = validatePanelGroupLayout(unsafe, state.constraints);
    state.defaultLayoutDeferred = state.groupSize === 0;
    byElement.set(group, state);
    mounted.set(state.id, state);
    if (!state.defaultLayoutDeferred) render(state);
    observe(state);
    return state;
  }

  function unmount(state) {
    state.resizeObserver?.disconnect();
    mounted.delete(state.id);
    byElement.delete(state.element);
  }

  function panelSize(state, panel) {
    return {
      asPercentage: state.layout[panel.id],
      inPixels: state.orientation === "horizontal" ? panel.element.offsetWidth : panel.element.offsetHeight,
    };
  }

  function dispatchPanelResize(state, panel) {
    const next = panelSize(state, panel);
    const prev = panel.prevSize;
    if (!prev || !layoutNumbersEqual(prev.asPercentage, next.asPercentage) || prev.inPixels !== next.inPixels) {
      panel.prevSize = next;
      panel.element.dispatchEvent(new CustomEvent("resizable-panel-resize", {
        bubbles: true,
        detail: { panelSize: next, id: panel.id, prevPanelSize: prev },
      }));
    }
  }

  function pairForSeparator(state, separator) {
    const children = sortByElementOffset(state.orientation,
      [...state.element.children].map((element) => ({ element })));
    const index = children.findIndex((record) => record.element === separator.element);
    let before;
    let after;
    for (let i = index - 1; i >= 0; i--) {
      before = state.panels.find((panel) => panel.element === children[i].element);
      if (before) break;
    }
    for (let i = index + 1; i < children.length; i++) {
      after = state.panels.find((panel) => panel.element === children[i].element);
      if (after) break;
    }
    return before && after ? [before, after] : null;
  }

  function calculateSeparatorAriaValues(state, panel, panelIndex) {
    const constraints = state.constraints.find((current) => current.panelId === panel.id);
    const panelSizeValue = state.layout[panel.id];
    if (!constraints) return {};
    const minSize = constraints.collapsible ? constraints.collapsedSize : constraints.minSize;
    const pivots = [panelIndex, panelIndex + 1];
    const minLayout = validatePanelGroupLayout(adjustLayoutByDelta({
      delta: minSize - panelSizeValue,
      initialLayout: state.layout,
      panelConstraints: state.constraints,
      pivotIndices: pivots,
      prevLayout: state.layout,
    }), state.constraints);
    const maxLayout = validatePanelGroupLayout(adjustLayoutByDelta({
      delta: constraints.maxSize - panelSizeValue,
      initialLayout: state.layout,
      panelConstraints: state.constraints,
      pivotIndices: pivots,
      prevLayout: state.layout,
    }), state.constraints);
    return { controls: panel.id, min: minLayout[panel.id], max: maxLayout[panel.id], now: panelSizeValue };
  }

  function render(state) {
    const active = interaction.state === "active" && interaction.hitRegions.some((region) => region.state === state);
    state.panels.forEach((panel) => {
      panel.element.style.flexGrow = String(state.layout[panel.id] ?? 1);
      panel.element.style.flexBasis = "0px";
      panel.element.style.flexShrink = "1";
      panel.element.style.pointerEvents = active ? "none" : "";
      panel.element.dataset.panelSize = String(formatLayoutNumber(state.layout[panel.id]));
      dispatchPanelResize(state, panel);
    });
    state.separators.forEach((separator) => {
      const pair = pairForSeparator(state, separator);
      if (!pair) return;
      const primary = pair[0];
      const values = calculateSeparatorAriaValues(state, primary, state.panels.indexOf(primary));
      separator.element.setAttribute("aria-controls", values.controls);
      separator.element.setAttribute("aria-valuemin", String(values.min));
      separator.element.setAttribute("aria-valuemax", String(values.max));
      separator.element.setAttribute("aria-valuenow", String(values.now));
    });
  }

  function emitLayout(state, changed, isUserInteraction) {
    state.element.dispatchEvent(new CustomEvent(changed ? "resizable-layout-changed" : "resizable-layout-change", {
      bubbles: true,
      detail: { layout: { ...state.layout }, ...(changed ? { isUserInteraction } : {}) },
    }));
  }

  function updateLayout(state, nextLayout, { commit = false, isUserInteraction = false } = {}) {
    const prevLayout = state.layout;
    if (!layoutsEqual(prevLayout, nextLayout)) {
      state.constraints.forEach((constraints) => {
        if (constraints.collapsible && layoutNumbersEqual(nextLayout[constraints.panelId], constraints.collapsedSize) &&
            !layoutNumbersEqual(prevLayout[constraints.panelId], constraints.collapsedSize)) {
          state.expandedPanelSizes[constraints.panelId] = prevLayout[constraints.panelId];
        }
      });
      state.layout = nextLayout;
      render(state);
      emitLayout(state, false, isUserInteraction);
    }
    if (commit) emitLayout(state, true, isUserInteraction);
  }

  function observe(state) {
    const ResizeObserverClass = state.element.ownerDocument.defaultView?.ResizeObserver;
    if (!ResizeObserverClass) return;
    state.resizeObserver = new ResizeObserverClass(() => {
      const nextGroupSize = calculateAvailableGroupSize(state);
      if (nextGroupSize === 0) return;
      const nextConstraints = calculatePanelConstraints(state);
      const unsafe = state.defaultLayoutDeferred
        ? calculateDefaultLayout(nextConstraints)
        : preserveFixedPanelSizes(state, nextGroupSize, state.groupSize, state.layout);
      const nextLayout = validatePanelGroupLayout(unsafe, nextConstraints);
      state.constraints = nextConstraints;
      state.groupSize = nextGroupSize;
      state.defaultLayoutDeferred = false;
      updateLayout(state, nextLayout);
      render(state);
    });
    state.resizeObserver.observe(state.element);
    state.panels.forEach((panel) => state.resizeObserver.observe(panel.element));
  }

  function isCoarsePointer() {
    if (coarsePointer === undefined) coarsePointer = typeof matchMedia === "function" && matchMedia("(pointer:coarse)").matches;
    return coarsePointer;
  }

  function expandedRect(rect, minimum) {
    let { x, y, width, height } = rect;
    if (width < minimum) {
      const delta = minimum - width;
      x -= delta / 2;
      width += delta;
    }
    if (height < minimum) {
      const delta = minimum - height;
      y -= delta / 2;
      height += delta;
    }
    return { x, y, width, height, left: x, right: x + width, top: y, bottom: y + height };
  }

  function rectFrom(x, y, width, height) {
    return { x, y, width, height, left: x, right: x + width, top: y, bottom: y + height };
  }

  function findClosestRect(orientation, rects, targetRect) {
    const point = { x: targetRect.x + targetRect.width / 2, y: targetRect.y + targetRect.height / 2 };
    let closest;
    let minDistance = Number.MAX_VALUE;
    for (const rect of rects) {
      const distance = distanceFromPoint(rect, point);
      const value = orientation === "horizontal" ? distance.x : distance.y;
      if (value < minDistance) {
        minDistance = value;
        closest = rect;
      }
    }
    return closest;
  }

  function calculateHitRegions(state) {
    const children = sortByElementOffset(state.orientation,
      [...state.element.children].map((element) => ({ element })));
    const regions = [];

    let disabledSeparator = false;
    let hasInterleavedStaticContent = false;
    let firstEnabledPanelIndex = -1;
    let lastEnabledPanelIndex = -1;
    let numEnabledPanels = 0;
    let previousPanel;
    let pendingSeparators = [];

    let currentPanelIndex = -1;
    for (const child of children) {
      const panel = state.panels.find((current) => current.element === child.element);
      if (panel) {
        currentPanelIndex++;
        if (!panel.raw.disabled) {
          numEnabledPanels++;
          if (firstEnabledPanelIndex === -1) firstEnabledPanelIndex = currentPanelIndex;
          lastEnabledPanelIndex = currentPanelIndex;
        }
      }
    }

    if (numEnabledPanels <= 1) return regions;

    currentPanelIndex = -1;
    for (const child of children) {
      const panel = state.panels.find((current) => current.element === child.element);
      if (panel) {
        currentPanelIndex++;
        if (previousPanel) {
          const beforeRect = previousPanel.element.getBoundingClientRect();
          const afterRect = panel.element.getBoundingClientRect();

          let candidates;
          if (hasInterleavedStaticContent) {
            const firstPanelEdgeRect = state.orientation === "horizontal"
              ? rectFrom(beforeRect.right, beforeRect.top, 0, beforeRect.height)
              : rectFrom(beforeRect.left, beforeRect.bottom, beforeRect.width, 0);
            const secondPanelEdgeRect = state.orientation === "horizontal"
              ? rectFrom(afterRect.left, afterRect.top, 0, afterRect.height)
              : rectFrom(afterRect.left, afterRect.top, afterRect.width, 0);
            if (pendingSeparators.length === 0) {
              candidates = [firstPanelEdgeRect, secondPanelEdgeRect];
            } else if (pendingSeparators.length === 1) {
              const separator = pendingSeparators[0];
              const closestRect = findClosestRect(
                state.orientation,
                [beforeRect, afterRect],
                separator.element.getBoundingClientRect(),
              );
              candidates = [separator, closestRect === beforeRect ? secondPanelEdgeRect : firstPanelEdgeRect];
            } else {
              candidates = pendingSeparators;
            }
          } else if (pendingSeparators.length) {
            candidates = pendingSeparators;
          } else {
            candidates = [state.orientation === "horizontal"
              ? rectFrom(beforeRect.right, afterRect.top, afterRect.left - beforeRect.right, afterRect.height)
              : rectFrom(afterRect.left, beforeRect.bottom, afterRect.width, afterRect.top - beforeRect.bottom)];
          }

          for (const rectOrSeparator of candidates) {
            const separator = rectOrSeparator.element ? rectOrSeparator : undefined;
            let rect = separator ? separator.element.getBoundingClientRect() : rectOrSeparator;
            const minimum = isCoarsePointer() ? state.resizeTargetMinimumSize.coarse : state.resizeTargetMinimumSize.fine;
            rect = expandedRect(rect, minimum);
            const skip = currentPanelIndex <= firstEnabledPanelIndex || currentPanelIndex > lastEnabledPanelIndex;
            if (!disabledSeparator && !skip) {
              regions.push({
                state,
                groupSize: calculateAvailableGroupSize(state),
                panels: [previousPanel, panel],
                separator,
                rect,
              });
            }
            disabledSeparator = false;
          }
        }
        hasInterleavedStaticContent = false;
        previousPanel = panel;
        pendingSeparators = [];
        continue;
      }
      const separator = state.separators.find((current) => current.element === child.element);
      if (separator) {
        if (separator.disabled) disabledSeparator = true;
        pendingSeparators.push(separator);
      } else if (child.element.hasAttribute("data-separator")) {
        previousPanel = undefined;
        pendingSeparators = [];
      } else {
        hasInterleavedStaticContent = true;
      }
    }
    return regions;
  }

  function distanceFromPoint(rect, point) {
    return {
      x: point.x >= rect.left && point.x <= rect.right ? 0 : Math.min(Math.abs(point.x - rect.left), Math.abs(point.x - rect.right)),
      y: point.y >= rect.top && point.y <= rect.bottom ? 0 : Math.min(Math.abs(point.y - rect.top), Math.abs(point.y - rect.bottom)),
    };
  }

  function rectsIntersect(a, b) {
    return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
  }

  function stackingParent(node) {
    const parent = node.parentNode;
    return parent && parent.nodeType === Node.DOCUMENT_FRAGMENT_NODE ? parent.host : parent;
  }

  function stackingAncestors(node) {
    const ancestors = [];
    while (node) {
      ancestors.push(node);
      node = stackingParent(node);
    }
    return ancestors;
  }

  function isFlexItem(node) {
    const parent = stackingParent(node) || node;
    const display = getComputedStyle(parent).display;
    return display === "flex" || display === "inline-flex";
  }

  function createsStackingContext(node) {
    const style = getComputedStyle(node);
    if (style.position === "fixed") return true;
    if (style.zIndex !== "auto" && (style.position !== "static" || isFlexItem(node))) return true;
    if (+style.opacity < 1) return true;
    if ("transform" in style && style.transform !== "none") return true;
    if ("webkitTransform" in style && style.webkitTransform !== "none") return true;
    if ("mixBlendMode" in style && style.mixBlendMode !== "normal") return true;
    if ("filter" in style && style.filter !== "none") return true;
    if ("webkitFilter" in style && style.webkitFilter !== "none") return true;
    if ("isolation" in style && style.isolation === "isolate") return true;
    if (/\b(?:position|zIndex|opacity|transform|webkitTransform|mixBlendMode|filter|webkitFilter|isolation)\b/.test(style.willChange)) return true;
    if (style.webkitOverflowScrolling === "touch") return true;
    return false;
  }

  function findStackingContext(nodes) {
    let index = nodes.length;
    while (index--) {
      const node = nodes[index];
      if (node && createsStackingContext(node)) return node;
    }
    return null;
  }

  function stackingZIndex(node) {
    return (node && Number(getComputedStyle(node).zIndex)) || 0;
  }

  // Forked from stacking-order@2.0.0, matching react-resizable-panels.
  function compareStackingOrder(a, b) {
    if (a === b) throw new Error("Cannot compare node with itself");
    const ancestors = { a: stackingAncestors(a), b: stackingAncestors(b) };
    let commonAncestor;
    while (ancestors.a.at(-1) === ancestors.b.at(-1)) {
      commonAncestor = ancestors.a.pop();
      ancestors.b.pop();
    }
    if (!commonAncestor) throw new Error("Stacking order can only be calculated for elements with a common ancestor");
    const zIndexes = {
      a: stackingZIndex(findStackingContext(ancestors.a)),
      b: stackingZIndex(findStackingContext(ancestors.b)),
    };
    if (zIndexes.a === zIndexes.b) {
      const children = commonAncestor.childNodes;
      const furthestAncestors = { a: ancestors.a.at(-1), b: ancestors.b.at(-1) };
      let index = children.length;
      while (index--) {
        const child = children[index];
        if (child === furthestAncestors.a) return 1;
        if (child === furthestAncestors.b) return -1;
      }
    }
    return Math.sign(zIndexes.a - zIndexes.b);
  }

  function isElement(value) {
    return value !== null && typeof value === "object" && "nodeType" in value && value.nodeType === Node.ELEMENT_NODE;
  }

  function isViableHitTarget(groupElement, hitRegion, pointerEventTarget) {
    if (!isElement(pointerEventTarget) || pointerEventTarget.contains(groupElement) || groupElement.contains(pointerEventTarget)) {
      return true;
    }
    if (compareStackingOrder(pointerEventTarget, groupElement) > 0) {
      let currentElement = pointerEventTarget;
      while (currentElement) {
        if (currentElement.contains(groupElement)) return true;
        if (rectsIntersect(currentElement.getBoundingClientRect(), hitRegion)) return false;
        currentElement = currentElement.parentElement;
      }
    }
    return true;
  }

  function matchingHitRegions(event) {
    const matches = [];
    mounted.forEach((state) => {
      if (state.disabled) return;
      let closest;
      let closestDistance = Infinity;
      calculateHitRegions(state).forEach((region) => {
        const distance = distanceFromPoint(region.rect, { x: event.clientX, y: event.clientY });
        const primary = state.orientation === "horizontal" ? distance.x : distance.y;
        if (primary <= closestDistance) {
          closest = { region, distance };
          closestDistance = primary;
        }
      });
      if (closest && closest.distance.x <= 0 && closest.distance.y <= 0) {
        if (isViableHitTarget(state.element, closest.region.rect, event.target)) {
          matches.push(closest.region);
        }
      }
    });
    return matches;
  }

  function setSeparatorStates() {
    mounted.forEach((state) => state.separators.forEach((separator) => {
      let value = separator.disabled ? "disabled" : separator.element === separator.element.ownerDocument.activeElement ? "focus" : "inactive";
      if (!separator.disabled) {
        const matched = interaction.hitRegions.some((region) => region.separator === separator);
        if (matched) value = interaction.state === "active" ? "active" : interaction.state === "hover" ? "hover" : value;
      }
      separator.element.setAttribute("data-separator", value);
    }));
  }

  function supportsAdvancedCursorStyles() {
    if (advancedCursorStyles === undefined) {
      advancedCursorStyles = navigator.userAgent.includes("Chrome") || navigator.userAgent.includes("Firefox");
    }
    return advancedCursorStyles;
  }

  function cursorForInteraction() {
    if (interaction.state !== "hover" && interaction.state !== "active") return undefined;
    let horizontal = 0;
    let vertical = 0;
    interaction.hitRegions.forEach((region) => {
      if (region.state.disableCursor) return;
      if (region.state.orientation === "horizontal") horizontal++;
      else vertical++;
    });
    if (interaction.state === "active" && interaction.cursorFlags && supportsAdvancedCursorStyles()) {
      const horizontalMin = (interaction.cursorFlags & CURSOR_FLAG_HORIZONTAL_MIN) !== 0;
      const horizontalMax = (interaction.cursorFlags & CURSOR_FLAG_HORIZONTAL_MAX) !== 0;
      const verticalMin = (interaction.cursorFlags & CURSOR_FLAG_VERTICAL_MIN) !== 0;
      const verticalMax = (interaction.cursorFlags & CURSOR_FLAG_VERTICAL_MAX) !== 0;
      if (horizontalMin) return verticalMin ? "se-resize" : verticalMax ? "ne-resize" : "e-resize";
      if (horizontalMax) return verticalMin ? "sw-resize" : verticalMax ? "nw-resize" : "w-resize";
      if (verticalMin) return "s-resize";
      if (verticalMax) return "n-resize";
    }
    if (supportsAdvancedCursorStyles()) {
      if (horizontal && vertical) return "move";
      if (horizontal) return "ew-resize";
      if (vertical) return "ns-resize";
    } else {
      if (horizontal && vertical) return "grab";
      if (horizontal) return "col-resize";
      if (vertical) return "row-resize";
    }
    return undefined;
  }

  function updateCursor() {
    const cursor = cursorForInteraction();
    if (!cursorStyleElement) {
      cursorStyleElement = document.createElement("style");
      cursorStyleElement.dataset.tuiResizableCursor = "";
      document.head.appendChild(cursorStyleElement);
    }
    cursorStyleElement.textContent = cursor ? `*, *:hover { cursor: ${cursor} !important; }` : "";
  }

  function setInteraction(next) {
    const previouslyActive = interaction.state === "active";
    interaction = next;
    setSeparatorStates();
    updateCursor();
    if (previouslyActive || next.state === "active") mounted.forEach(render);
  }

  function updateActiveRegions(event, pointerDownAtPoint = interaction.pointerDownAtPoint) {
    let nextCursorFlags = 0;
    for (const region of interaction.hitRegions) {
      const state = region.state;
      let delta = 0;
      if (pointerDownAtPoint) {
        delta = state.orientation === "horizontal"
          ? ((event.clientX - pointerDownAtPoint.x) / region.groupSize) * 100
          : ((event.clientY - pointerDownAtPoint.y) / region.groupSize) * 100;
      } else {
        delta = state.orientation === "horizontal"
          ? event.clientX < 0 ? -100 : 100
          : event.clientY < 0 ? -100 : 100;
      }
      const initialLayout = interaction.initialLayoutMap.get(state);
      if (!initialLayout) continue;
      const next = adjustLayoutByDelta({
        delta,
        initialLayout,
        panelConstraints: state.constraints,
        pivotIndices: region.panels.map((panel) => state.panels.indexOf(panel)),
        prevLayout: state.layout,
        trigger: "mouse-or-touch",
      });
      if (layoutsEqual(next, state.layout)) {
        if (delta !== 0 && !state.disableCursor) {
          if (state.orientation === "horizontal") {
            nextCursorFlags |= delta < 0 ? CURSOR_FLAG_HORIZONTAL_MIN : CURSOR_FLAG_HORIZONTAL_MAX;
          } else {
            nextCursorFlags |= delta < 0 ? CURSOR_FLAG_VERTICAL_MIN : CURSOR_FLAG_VERTICAL_MAX;
          }
        }
      } else {
        updateLayout(state, next, { isUserInteraction: true });
      }
      if (region.separator && !region.separator.element.hasPointerCapture?.(event.pointerId)) {
        region.separator.element.setPointerCapture?.(event.pointerId);
      }
    }

    let cursorFlags = 0;
    if (event.movementX === 0) cursorFlags |= interaction.cursorFlags & CURSOR_FLAGS_HORIZONTAL;
    else cursorFlags |= nextCursorFlags & CURSOR_FLAGS_HORIZONTAL;
    if (event.movementY === 0) cursorFlags |= interaction.cursorFlags & CURSOR_FLAGS_VERTICAL;
    else cursorFlags |= nextCursorFlags & CURSOR_FLAGS_VERTICAL;
    interaction.cursorFlags = cursorFlags;
    updateCursor();
  }

  function completePointerResize(event) {
    if (interaction.state !== "active") return false;
    const regions = interaction.hitRegions;
    regions.forEach((region) => {
      if (event?.pointerId !== undefined && region.separator?.element.hasPointerCapture?.(event.pointerId)) {
        region.separator.element.releasePointerCapture(event.pointerId);
      }
    });
    setInteraction({ state: "inactive", hitRegions: [], cursorFlags: 0 });
    new Set(regions.map((region) => region.state)).forEach((state) => {
      render(state);
      emitLayout(state, true, true);
    });
    return regions.length > 0;
  }

  document.addEventListener("pointerdown", (event) => {
    if (event.defaultPrevented || (event.pointerType === "mouse" && event.button > 0)) return;
    const hitRegions = matchingHitRegions(event);
    const initialLayoutMap = new Map();
    hitRegions.forEach((region, index) => {
      // react-resizable-panels 4.5.8 calls focus() without suppressing the
      // focus-visible indicator; this is the behavior shipped by shadcn/ui.
      if (index === 0 && region.separator) region.separator.element.focus();
      initialLayoutMap.set(region.state, { ...region.state.layout });
    });
    setInteraction({
      state: "active",
      hitRegions,
      cursorFlags: 0,
      initialLayoutMap,
      pointerDownAtPoint: { x: event.clientX, y: event.clientY },
      pointerId: event.pointerId,
    });
    if (hitRegions.length) event.preventDefault();
  }, true);

  document.addEventListener("pointermove", (event) => {
    if (event.defaultPrevented) return;
    if (interaction.state === "active") {
      if (event.buttons === 0) {
        completePointerResize(event);
        return;
      }
      updateActiveRegions(event);
      return;
    }
    const hitRegions = matchingHitRegions(event);
    setInteraction(hitRegions.length
      ? { state: "hover", hitRegions, cursorFlags: 0 }
      : { state: "inactive", hitRegions: [], cursorFlags: 0 });
  });

  document.addEventListener("pointerleave", (event) => {
    if (interaction.state === "active") updateActiveRegions(event, null);
  });

  document.addEventListener("pointerout", (event) => {
    const IFrame = event.currentTarget.defaultView?.HTMLIFrameElement;
    if (IFrame && event.relatedTarget instanceof IFrame && interaction.state === "hover") {
      setInteraction({ state: "inactive", hitRegions: [], cursorFlags: 0 });
    }
  });

  document.addEventListener("pointerup", (event) => {
    if (event.defaultPrevented || (event.pointerType === "mouse" && event.button > 0)) return;
    if (completePointerResize(event)) event.preventDefault();
  }, true);
  document.addEventListener("pointercancel", completePointerResize, true);
  document.addEventListener("contextmenu", (event) => {
    if (!event.defaultPrevented) completePointerResize(event);
  }, true);

  document.addEventListener("focusin", (event) => {
    if (event.target instanceof Element && event.target.matches(HANDLE)) setSeparatorStates();
  });
  document.addEventListener("focusout", (event) => {
    if (event.target instanceof Element && event.target.matches(HANDLE)) queueMicrotask(setSeparatorStates);
  });

  function adjustForSeparator(state, separator, delta) {
    const pair = pairForSeparator(state, separator);
    if (!pair) return;
    const next = validatePanelGroupLayout(adjustLayoutByDelta({
      delta,
      initialLayout: state.layout,
      panelConstraints: state.constraints,
      pivotIndices: pair.map((panel) => state.panels.indexOf(panel)),
      prevLayout: state.layout,
      trigger: "keyboard",
    }), state.constraints);
    updateLayout(state, next, { commit: true, isUserInteraction: true });
  }

  document.addEventListener("keydown", (event) => {
    if (event.defaultPrevented) return;
    if (!(event.target instanceof Element) || !event.target.matches(HANDLE)) return;
    const state = stateFor(event.target.closest(GROUP));
    const separator = state?.separators.find((current) => current.element === event.target);
    if (!state || !separator || state.disabled || separator.disabled) return;
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (state.orientation === "vertical") adjustForSeparator(state, separator, 5);
        break;
      case "ArrowLeft":
        event.preventDefault();
        if (state.orientation === "horizontal") adjustForSeparator(state, separator, -5);
        break;
      case "ArrowRight":
        event.preventDefault();
        if (state.orientation === "horizontal") adjustForSeparator(state, separator, 5);
        break;
      case "ArrowUp":
        event.preventDefault();
        if (state.orientation === "vertical") adjustForSeparator(state, separator, -5);
        break;
      case "Home":
        event.preventDefault();
        adjustForSeparator(state, separator, -100);
        break;
      case "End":
        event.preventDefault();
        adjustForSeparator(state, separator, 100);
        break;
      case "Enter": {
        event.preventDefault();
        const pair = pairForSeparator(state, separator);
        const primary = pair?.[0];
        const constraints = primary && state.constraints.find((current) => current.panelId === primary.id);
        if (primary && constraints?.collapsible) {
          const prevSize = state.layout[primary.id];
          const nextSize = layoutNumbersEqual(constraints.collapsedSize, prevSize)
            ? state.expandedPanelSizes[primary.id] ?? constraints.minSize
            : constraints.collapsedSize;
          adjustForSeparator(state, separator, nextSize - prevSize);
        }
        break;
      }
      case "F6": {
        event.preventDefault();
        const index = state.separators.indexOf(separator);
        const nextIndex = event.shiftKey
          ? index > 0 ? index - 1 : state.separators.length - 1
          : index + 1 < state.separators.length ? index + 1 : 0;
        state.separators[nextIndex]?.element.focus({ preventScroll: true });
        break;
      }
    }
  });

  function setPanelSize(state, panel, nextSize) {
    const prevSize = state.layout[panel.id];
    if (layoutNumbersEqual(nextSize, prevSize)) return false;
    const index = state.panels.indexOf(panel);
    const isFirst = index === 0;
    const isLast = index === state.panels.length - 1;
    let unsafe;
    const allPreviousCollapsed = isLast && nextSize < prevSize &&
      (isFirst || state.panels.slice(0, index).every((_, panelIndex) => {
        const constraints = state.constraints[panelIndex];
        return constraints.collapsible && layoutNumbersEqual(constraints.collapsedSize, state.layout[constraints.panelId]);
      }));
    if (allPreviousCollapsed) {
      const occupied = state.panels.slice(0, index).reduce((total, current) => total + state.layout[current.id], 0);
      unsafe = { ...state.layout, [panel.id]: formatLayoutNumber(100 - occupied) };
    } else {
      if (state.panels.length < 2) return false;
      unsafe = adjustLayoutByDelta({
        delta: isLast ? prevSize - nextSize : nextSize - prevSize,
        initialLayout: state.layout,
        panelConstraints: state.constraints,
        pivotIndices: isLast ? [index - 1, index] : [index, index + 1],
        prevLayout: state.layout,
        trigger: "imperative-api",
      });
    }
    const next = validatePanelGroupLayout(unsafe, state.constraints);
    if (layoutsEqual(state.layout, next)) return false;
    updateLayout(state, next, { commit: true, isUserInteraction: false });
    return true;
  }

  function resolve(value, selector) {
    if (value instanceof Element) return value.matches(selector) ? value : value.closest(selector);
    if (typeof value !== "string") return null;
    const byId = document.getElementById(value);
    if (byId?.matches(selector)) return byId;
    try {
      const match = document.querySelector(value);
      return match?.matches(selector) ? match : null;
    } catch (_) { return null; }
  }

  function panelAndState(value) {
    const element = resolve(value, PANEL);
    const state = stateFor(element?.closest(GROUP));
    const panel = state?.panels.find((current) => current.element === element);
    return { element, state, panel };
  }

  function resizePanel(value, size) {
    const { state, panel } = panelAndState(value);
    if (!state || !panel || state.defaultLayoutDeferred) return false;
    const pixels = sizeStyleToPixels(state, panel, size);
    const percentage = formatLayoutNumber((pixels / calculateAvailableGroupSize(state)) * 100);
    return setPanelSize(state, panel, percentage);
  }

  document.addEventListener("dblclick", (event) => {
    if (event.defaultPrevented) return;
    matchingHitRegions(event).forEach((region) => {
      if (region.separator?.disableDoubleClick) return;
      const panel = region.panels.find((current) => current.raw.defaultSize !== undefined);
      if (panel && resizePanel(panel.element, panel.raw.defaultSize)) event.preventDefault();
    });
  }, true);

  const api = {
    resize: resizePanel,
    collapse(value) {
      const { state, panel } = panelAndState(value);
      const constraints = state?.constraints.find((current) => current.panelId === panel?.id);
      if (!state || !panel || !constraints?.collapsible || layoutNumbersEqual(state.layout[panel.id], constraints.collapsedSize)) return false;
      panel.expandToSize = state.layout[panel.id];
      return setPanelSize(state, panel, constraints.collapsedSize);
    },
    expand(value) {
      const { state, panel } = panelAndState(value);
      const constraints = state?.constraints.find((current) => current.panelId === panel?.id);
      if (!state || !panel || !constraints?.collapsible || !layoutNumbersEqual(state.layout[panel.id], constraints.collapsedSize)) return false;
      let nextSize = panel.expandToSize ?? constraints.minSize;
      if (nextSize === 0) nextSize = 1;
      return setPanelSize(state, panel, nextSize);
    },
    getSize(value) {
      const { state, panel } = panelAndState(value);
      return state && panel ? panelSize(state, panel) : null;
    },
    isCollapsed(value) {
      const { state, panel } = panelAndState(value);
      const constraints = state?.constraints.find((current) => current.panelId === panel?.id);
      return Boolean(state && panel && constraints?.collapsible && layoutNumbersEqual(constraints.collapsedSize, state.layout[panel.id]));
    },
    getLayout(value) {
      const state = stateFor(resolve(value, GROUP));
      return !state || state.defaultLayoutDeferred ? {} : { ...state.layout };
    },
    setLayout(value, unsafeLayout) {
      const state = stateFor(resolve(value, GROUP));
      if (!state || state.defaultLayoutDeferred || !unsafeLayout || Array.isArray(unsafeLayout)) return {};
      const ordered = state.panels.reduce((layout, panel) => {
        layout[panel.id] = unsafeLayout[panel.id];
        return layout;
      }, {});
      const next = validatePanelGroupLayout(ordered, state.constraints);
      updateLayout(state, next, { commit: true, isUserInteraction: false });
      return { ...next };
    },
  };

  function initialize(root = document) {
    if (root.matches?.(GROUP)) stateFor(root);
    root.querySelectorAll?.(GROUP).forEach(stateFor);
  }

  function cleanup(root) {
    mounted.forEach((state) => {
      if (state.element === root || root.contains?.(state.element)) unmount(state);
    });
  }

  window.tui = window.tui || {};
  window.tui.resizable = api;
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => initialize());
  else initialize();
  new MutationObserver((records) => records.forEach((record) => {
    record.removedNodes.forEach((node) => {
      if (node instanceof Element) cleanup(node);
    });
    record.addedNodes.forEach((node) => {
      if (node instanceof Element) initialize(node);
    });
  })).observe(document.documentElement, { childList: true, subtree: true });
})();

// components/select/select.js
// Uses window.FloatingUIDOM from components/floatingui (loaded in the same bundle).
(function () {
  // Constants from Base UI's select, shadcn's reference implementation.
  const EXIT_MS = 120; // popper exit animation (duration-100) + slack
  const SIDE_OFFSET = 4;
  const COLLISION_PADDING = 5;
  const MARGIN = 10; // aligned mode: minimum distance to the viewport edges
  const MIN_HEIGHT = 100; // less room than this -> fall back to popper
  const TRIGGER_COLLISION = 20; // trigger this close to an edge -> popper
  const TOL = 1; // scroll edge tolerance
  const ARROW_TICK_MS = 40; // hovering a scroll arrow scrolls one item per tick
  const SELECTED_DELAY = 400; // mouseup selection stays disabled this long after open

  const escapeTargets = new WeakSet();
  function listenForEscape(element) {
    if (!element || escapeTargets.has(element)) return;
    element.addEventListener("keydown", closeOnEscapeKeyDown);
    escapeTargets.add(element);
  }

  // useDismiss: popup/reference listeners stop Escape before outer document handlers.
  function closeOnEscapeKeyDown(event) {
    if (event.key !== "Escape") return;
    const contents = event.currentTarget === document
      ? allContents()
      : [event.currentTarget.hasAttribute("data-tui-select-content")
        ? event.currentTarget
        : contentFor(event.currentTarget)];
    let handled = false;
    for (const content of contents) {
      if (!content?.hasAttribute("data-open")) continue;
      const trigger = triggerFor(content);
      if (requestOpenChange(content, false)) event.preventDefault();
      if (trigger) trigger.focus();
      event.stopPropagation();
      handled = true;
    }
    return handled;
  }

  function allContents() {
    return document.querySelectorAll("[data-tui-select-content]");
  }

  function triggerFor(content) {
    return document.querySelector(
      '[data-tui-select-trigger][aria-controls="' + content.id + '"]',
    );
  }

  function contentFor(trigger) {
    return document.getElementById(trigger.getAttribute("aria-controls"));
  }

  // The hidden form input sits right before the trigger button.
  function inputFor(trigger) {
    const prev = trigger.previousElementSibling;
    return prev && prev.hasAttribute("data-tui-select-input") ? prev : null;
  }

  // Focus waits until after the input task:
  // Chromium's mousedown default focuses the trigger, WebKit's clears focus.
  // One frame, like Base UI, with a guard for a popup that closed meanwhile.
  function enqueueFocus(el, shouldFocus) {
    if (!el) return;
    requestAnimationFrame(() => {
      if (shouldFocus && !shouldFocus()) return;
      el.focus({ preventScroll: true });
    });
  }

  function valueSpanFor(trigger) {
    return trigger.querySelector("[data-tui-select-value]");
  }

  function popupFor(content) {
    return content.querySelector("[data-tui-select-popup]");
  }

  function viewportFor(content) {
    return content.querySelector("[data-tui-select-viewport]");
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function maxScrollTop(el) {
    return Math.max(0, el.scrollHeight - el.clientHeight);
  }

  function isAlignMode(content) {
    return !content.hasAttribute("data-tui-select-disable-align-item-with-trigger");
  }

  function setState(content, state) {
    const open = state === "open";
    content.toggleAttribute("data-open", open);
    content.toggleAttribute("data-closed", !open);
    const popup = popupFor(content);
    if (popup) {
      popup.toggleAttribute("data-open", open);
      popup.toggleAttribute("data-closed", !open);
    }
  }

  function isOpen(content) {
    return !!content && content.hasAttribute("data-open");
  }

  function setTransitionAttribute(content, name, present) {
    content.toggleAttribute(name, present);
    const popup = popupFor(content);
    if (popup) popup.toggleAttribute(name, present);
  }

  function startTransition(content) {
    setTransitionAttribute(content, "data-ending-style", false);
    setTransitionAttribute(content, "data-starting-style", true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setTransitionAttribute(content, "data-starting-style", false));
    });
  }

  function setSide(content, side) {
    content.setAttribute("data-side", side);
    const popup = popupFor(content);
    if (popup) popup.setAttribute("data-side", side);
    const trigger = triggerFor(content);
    if (trigger) trigger.setAttribute("data-popup-side", side);
  }

  // Base UI zooms the popup out of the anchor's center point (e.g.
  // "96px -4px"), not out of a placement corner.
  function anchorOrigin(result, anchorRect, positionerRect) {
    const side = result.placement.split("-")[0];
    const centerX = anchorRect.left + anchorRect.width / 2 - positionerRect.left + "px";
    const centerY = anchorRect.top + anchorRect.height / 2 - positionerRect.top + "px";
    if (side === "bottom") return centerX + " " + -SIDE_OFFSET + "px";
    if (side === "top") return centerX + " calc(100% + " + SIDE_OFFSET + "px)";
    if (side === "right") return -SIDE_OFFSET + "px " + centerY;
    return "calc(100% + " + SIDE_OFFSET + "px) " + centerY;
  }

  // Moves the content to <body> (shadcn portals it the same way).
  // The unmount half of the React portal pendant: a portaled content lives
  // as long as its SSR declaration site (_tuiPortalOwner) stays in the
  // document. Trigger-presence heuristics judged mid-swap moments wrongly -
  // multi-phase swap layers briefly disconnect the new triggers.
  function removeOrphanedContents(content) {
    document.querySelectorAll("body > [data-tui-select-content]").forEach((c) => {
      if (c !== content && c._tuiPortalOwner && !c._tuiPortalOwner.isConnected) {
        stopAutoPositioning(c);
        c._tuiReleaseScroll?.();
        c._tuiReleaseScroll = null;
        c.remove();
      }
    });
  }

  function portal(content) {
    listenForEscape(content);
    removeOrphanedContents(content);
    if (content.parentElement !== document.body) {
      if (!content._tuiPortalOwner) content._tuiPortalOwner = content.parentElement;
      document.body.appendChild(content);
    }
  }

  // Clears everything a previous open left behind on the positioner and popup.
  function resetInlineStyles(content) {
    ["left", "right", "top", "bottom", "height", "maxHeight", "marginTop", "marginBottom"].forEach(
      (prop) => (content.style[prop] = ""),
    );
    const popup = popupFor(content);
    if (popup) popup.style.height = "";
  }

  // Regular anchored placement below/above the trigger (Base UI's positioner).
  function positionPopper(content, trigger, strategy) {
    const { computePosition, offset, flip, shift, size } = window.FloatingUIDOM;
    const align = content.getAttribute("data-tui-select-align") || "center";
    const placement = align === "center" ? "bottom" : "bottom-" + align;

    content.style.position = strategy;

    return computePosition(trigger, content, {
      placement: placement,
      strategy: strategy,
      middleware: [
        offset(SIDE_OFFSET),
        flip({ padding: COLLISION_PADDING }),
        shift({ padding: COLLISION_PADDING }),
        size({
          padding: COLLISION_PADDING,
          apply(args) {
            content.style.setProperty(
              "--available-height",
              args.availableHeight + "px",
            );
            content.style.setProperty(
              "--anchor-width",
              args.rects.reference.width + "px",
            );
          },
        }),
      ],
    }).then((result) => {
      content.style.left = result.x + "px";
      content.style.top = result.y + "px";
      setSide(content, result.placement.split("-")[0]);
      const popup = popupFor(content);
      if (popup) {
        popup.style.setProperty(
          "--transform-origin",
          anchorOrigin(result, trigger.getBoundingClientRect(), content.getBoundingClientRect()),
        );
      }
    });
  }

  // Overlays the menu so the selected item sits on the trigger with its text
  // aligned to the trigger text. Port of Base UI's SelectPopup align logic.
  // Runs after the popper pass (which sets the CSS vars and fallback coords);
  // returns false when Base UI would fall back to popper positioning.
  function positionAligned(content, trigger) {
    const popup = popupFor(content);
    const viewport = viewportFor(content);
    const valueEl = valueSpanFor(trigger);
    const textEl =
      content.querySelector('[data-tui-select-item][data-selected] [data-tui-select-item-text]') ||
      content.querySelector("[data-tui-select-item] [data-tui-select-item-text]");

    const docEl = document.documentElement;
    const triggerRect = trigger.getBoundingClientRect();
    const positionerRect = content.getBoundingClientRect(); // natural size from the popper pass
    // The list's natural height, measured before the aligned styles stretch
    // the popup (scrollHeight can never report less than the client height).
    const naturalScrollHeight = viewport.scrollHeight;
    const popupStyles = window.getComputedStyle(popup);
    const borderBottom = parseFloat(popupStyles.borderBottomWidth) || 0;
    const maxPopupHeight = parseFloat(popupStyles.maxHeight) || Infinity;
    const viewportHeight = docEl.clientHeight - MARGIN * 2;
    const viewportWidth = docEl.clientWidth;
    const availableSpaceBeneathTrigger = viewportHeight - triggerRect.bottom + triggerRect.height;

    let alignedLeft = triggerRect.left;
    let offsetY = 0;
    let textRect = null;
    if (textEl && valueEl) {
      const valueRect = valueEl.getBoundingClientRect();
      textRect = textEl.getBoundingClientRect();
      alignedLeft = positionerRect.left + (valueRect.left - textRect.left);
      offsetY =
        textRect.top - positionerRect.top + textRect.height / 2 -
        (valueRect.top - triggerRect.top + valueRect.height / 2);
    }

    const idealHeight = availableSpaceBeneathTrigger + offsetY + MARGIN + borderBottom;
    let height = Math.min(viewportHeight, idealHeight);
    const maxHeight = viewportHeight - MARGIN * 2;
    const scrollTop = idealHeight - height;

    content.style.left =
      clamp(
        alignedLeft,
        COLLISION_PADDING,
        Math.max(COLLISION_PADDING, viewportWidth - COLLISION_PADDING - positionerRect.width),
      ) + "px";
    content.style.height = height + "px";
    content.style.maxHeight = "none";
    content.style.marginTop = MARGIN + "px";
    content.style.marginBottom = MARGIN + "px";
    popup.style.height = "100%";

    const max = maxScrollTop(viewport);
    const isTopPositioned = scrollTop >= max - TOL;

    if (isTopPositioned) {
      height = Math.min(viewportHeight, positionerRect.height) - (scrollTop - max);
    }

    if (
      triggerRect.top < TRIGGER_COLLISION ||
      triggerRect.bottom > viewportHeight - TRIGGER_COLLISION ||
      Math.ceil(height) + TOL < Math.min(naturalScrollHeight, MIN_HEIGHT)
    ) {
      return false;
    }

    content._tuiReachedMax = false;

    if (isTopPositioned) {
      const topOffset = Math.max(0, viewportHeight - idealHeight);
      content.style.top = (positionerRect.height >= maxHeight ? 0 : topOffset) + "px";
      content.style.height = height + "px";
      viewport.scrollTop = maxScrollTop(viewport);
    } else {
      content.style.top = "auto";
      content.style.bottom = "0px";
      viewport.scrollTop = scrollTop;
    }

    if (textRect) {
      const clampedY = clamp(
        positionerRect.height > 0
          ? ((textRect.top + textRect.height / 2 - positionerRect.top) / positionerRect.height) * 100
          : 50,
        0,
        100,
      );
      popup.style.setProperty("--transform-origin", "50% " + clampedY + "%");
    }

    setSide(content, "none");
    if (height >= viewportHeight || height >= maxPopupHeight) {
      content._tuiReachedMax = true;
    }
    return true;
  }

  function position(content, trigger) {
    const popup = popupFor(content);
    const viewport = viewportFor(content);
    if (!popup || !viewport) return Promise.resolve();
    // Base UI uses viewport positioning while the selected item is aligned
    // with the trigger. Touch and regular popper positioning use Floating
    // UI's standard absolute positioning instead.
    const alignMode = isAlignMode(content) && content._tuiOpenMethod !== "touch";
    popup.setAttribute("data-align-trigger", alignMode ? "true" : "false");
    resetInlineStyles(content);
    content._tuiAligned = false;

    return positionPopper(content, trigger, alignMode ? "fixed" : "absolute")
      .then(() => {
        if (!alignMode) return undefined;
        if (positionAligned(content, trigger)) {
          content._tuiAligned = true;
          return undefined;
        }
        // Not enough room: redo the plain popper pass (the aligned attempt
        // dirtied the inline styles).
        popup.setAttribute("data-align-trigger", "false");
        resetInlineStyles(content);
        return positionPopper(content, trigger, "absolute");
      })
      .then(() => updateScrollArrows(content));
  }

  function startAutoPositioning(content, trigger) {
    if (content._tuiPositionCleanup) content._tuiPositionCleanup();
    let resolveFirst;
    const firstPosition = new Promise((resolve) => {
      resolveFirst = resolve;
    });
    const update = () => position(content, trigger).then(resolveFirst, resolveFirst);
    content._tuiPositionCleanup = window.FloatingUIDOM.autoUpdate(trigger, content, update, {
      elementResize: typeof ResizeObserver !== "undefined",
      layoutShift: typeof IntersectionObserver !== "undefined",
    });
    return firstPosition;
  }

  function stopAutoPositioning(content) {
    if (!content._tuiPositionCleanup) return;
    content._tuiPositionCleanup();
    content._tuiPositionCleanup = null;
  }

  // ----- scroll arrows + capped grow-on-scroll (Base UI behavior) -----------

  function updateScrollArrows(content) {
    const viewport = viewportFor(content);
    const up = content.querySelector("[data-tui-select-scroll-up]");
    const down = content.querySelector("[data-tui-select-scroll-down]");
    if (!viewport || !up || !down) return;
    const max = maxScrollTop(viewport);
    up.classList.toggle("hidden", max <= 0 || viewport.scrollTop <= TOL);
    down.classList.toggle("hidden", max <= 0 || viewport.scrollTop >= max - TOL);
  }

  // In aligned mode scrolling first consumes the remaining space toward the
  // viewport edge (capped by the popup's max-height), then scrolls the list.
  function handleAlignedScroll(content) {
    const viewport = viewportFor(content);
    const popup = popupFor(content);
    if (!viewport || !popup) return;

    const isTopPositioned = content.style.top === "0px";
    const isBottomPositioned = content.style.bottom === "0px";

    if (content._tuiReachedMax || !content._tuiAligned || (!isTopPositioned && !isBottomPositioned)) {
      updateScrollArrows(content);
      return;
    }

    const currentHeight = content.getBoundingClientRect().height;
    const maxPopupHeight = parseFloat(window.getComputedStyle(popup).maxHeight) || Infinity;
    const maxAvailableHeight = Math.min(
      document.documentElement.clientHeight - MARGIN * 2,
      maxPopupHeight,
    );

    const scrollTop = viewport.scrollTop;
    const max = maxScrollTop(viewport);

    let nextScrollTop = null;
    const diff = isTopPositioned ? max - scrollTop : scrollTop;
    const nextHeight = Math.min(currentHeight + diff, maxAvailableHeight);

    if (diff <= TOL) {
      const heightDelta = clamp(diff, 0, maxAvailableHeight - currentHeight);
      if (heightDelta > 0) {
        content.style.height = currentHeight + heightDelta + "px";
      }
      viewport.scrollTop = isTopPositioned ? maxScrollTop(viewport) : 0;
      if (maxAvailableHeight - (currentHeight + heightDelta) <= TOL) {
        content._tuiReachedMax = true;
      }
      updateScrollArrows(content);
      return;
    }

    if (maxAvailableHeight - nextHeight > TOL) {
      nextScrollTop = isTopPositioned ? Infinity : 0;
    } else if (isBottomPositioned && scrollTop < max) {
      const overshoot = currentHeight + diff - maxAvailableHeight;
      nextScrollTop = scrollTop - (diff - overshoot);
    }

    const nextPositionerHeight = Math.ceil(nextHeight);
    if (nextPositionerHeight !== 0) {
      content.style.height = nextPositionerHeight + "px";
    }

    if (nextScrollTop != null) {
      const target = clamp(nextScrollTop, 0, maxScrollTop(viewport));
      if (Math.abs(viewport.scrollTop - target) > TOL) {
        viewport.scrollTop = target;
      }
    }

    if (nextPositionerHeight >= maxAvailableHeight - TOL) {
      content._tuiReachedMax = true;
    }
    updateScrollArrows(content);
  }

  // Hovering a scroll arrow scrolls one item per tick, keeping the next item
  // clear of the arrow overlay (Base UI's getTargetScrollTop).
  function targetScrollTop(items, isUp, scrollTop, clientHeight, arrowHeight, max) {
    if (isUp) {
      let firstVisibleIndex = 0;
      const visibleTop = scrollTop + arrowHeight - TOL;
      for (let i = 0; i < items.length; i += 1) {
        if (items[i].offsetTop >= visibleTop) {
          firstVisibleIndex = i;
          break;
        }
      }
      const targetIndex = Math.max(0, firstVisibleIndex - 1);
      const target = items[targetIndex];
      return targetIndex < firstVisibleIndex && target
        ? clamp(target.offsetTop - arrowHeight, 0, max)
        : 0;
    }

    let lastVisibleIndex = items.length - 1;
    const visibleBottom = scrollTop + clientHeight - arrowHeight + TOL;
    for (let i = 0; i < items.length; i += 1) {
      if (items[i].offsetTop + items[i].offsetHeight > visibleBottom) {
        lastVisibleIndex = Math.max(0, i - 1);
        break;
      }
    }
    const targetIndex = Math.min(items.length - 1, lastVisibleIndex + 1);
    const target = items[targetIndex];
    return targetIndex > lastVisibleIndex && target
      ? clamp(target.offsetTop + target.offsetHeight - clientHeight + arrowHeight, 0, max)
      : max;
  }

  let arrowTimer = null;

  function stopArrowScroll() {
    clearTimeout(arrowTimer);
    arrowTimer = null;
  }

  function arrowScrollStep(content, isUp, arrow) {
    const viewport = viewportFor(content);
    if (!viewport) return;
    updateScrollArrows(content);
    const max = maxScrollTop(viewport);
    const scrollTop = clamp(viewport.scrollTop, 0, max);
    if (scrollTop === (isUp ? 0 : max)) {
      stopArrowScroll();
      return;
    }
    const items = [...content.querySelectorAll("[data-tui-select-item]")];
    viewport.scrollTop = targetScrollTop(
      items,
      isUp,
      scrollTop,
      viewport.clientHeight,
      arrow.offsetHeight || 0,
      max,
    );
    arrowTimer = setTimeout(() => arrowScrollStep(content, isUp, arrow), ARROW_TICK_MS);
  }

  document.addEventListener("mouseover", (e) => {
    if (!(e.target instanceof Element)) return;
    const arrow = e.target.closest("[data-tui-select-scroll-up], [data-tui-select-scroll-down]");
    if (!arrow || arrowTimer) return;
    const content = arrow.closest("[data-tui-select-content]");
    if (content) arrowScrollStep(content, arrow.hasAttribute("data-tui-select-scroll-up"), arrow);
  });

  document.addEventListener("mouseout", (e) => {
    if (!(e.target instanceof Element)) return;
    if (e.target.closest("[data-tui-select-scroll-up], [data-tui-select-scroll-down]")) {
      stopArrowScroll();
    }
  });

  // ----- open / close -------------------------------------------------------

  function open(content, trigger, openMethod) {
    allContents().forEach((c) => {
      if (c !== content) close(c);
    });
    clearTimeout(content._tuiHide);
    content._tuiOpenMethod = openMethod || "programmatic";
    // A press on the trigger can open the popup under the pointer (aligned
    // mode). Mouseup selection stays disabled briefly so releasing over the
    // selected item or a neighboring item doesn't commit an accidental
    // selection (Base UI's selectionRef + SELECTED_DELAY). Dragging can
    // re-arm unselected mouseup sooner, see the pointermove handler.
    content._tuiSelection = {
      allowSelectedMouseUp: false,
      allowUnselectedMouseUp: false,
      dragY: 0,
    };
    clearTimeout(content._tuiSelectedDelay);
    content._tuiSelectedDelay = setTimeout(() => {
      content._tuiSelection.allowSelectedMouseUp = true;
      content._tuiSelection.allowUnselectedMouseUp = true;
    }, SELECTED_DELAY);
    portal(content);
    // z-index portal like shadcn (no native top layer); re-append
    // keeps paint order = open order.
    document.body.appendChild(content);
    content.hidden = false;

    // Position it invisibly first, then play the enter animation in place.
    content.style.visibility = "hidden";
    const finish = () => {
      // The popup transitions `all` (duration-100), so clearing the
      // measuring visibility would animate visibility itself - and in
      // background tabs and throttled iframes that transition freezes at
      // its hidden start value. Flip with transitions suppressed.
      const popup = popupFor(content);
      content.style.transitionProperty = "none";
      if (popup) popup.style.transitionProperty = "none";
      content.style.visibility = "";
      void content.offsetWidth;
      content.style.transitionProperty = "";
      if (popup) {
        void popup.offsetWidth;
        popup.style.transitionProperty = "";
      }
      if (content.hidden || !content.isConnected) return;
      // useAnchoredPopupScrollLock measures the positioned popup for touch opens.
      content._tuiReleaseScroll?.();
      content._tuiReleaseScroll = window.tui.scrollLock.anchoredPopup(
        true, content._tuiOpenMethod === "touch", content, trigger,
      );
      setState(content, "open");
      startTransition(content);
      trigger.setAttribute("aria-expanded", "true");
      trigger.setAttribute("data-popup-open", "");
      trigger.setAttribute("data-pressed", "");
      // Base UI moves focus to the selected item when the listbox opens.
      const selected =
        content.querySelector('[data-tui-select-item][data-selected]') ||
        content.querySelector("[data-tui-select-item]");
      enqueueFocus(selected, () => isOpen(content));
    };
    startAutoPositioning(content, trigger).then(finish, finish);
  }

  function close(content) {
    if (content.hidden) return;
    stopAutoPositioning(content);
    stopArrowScroll();
    clearTimeout(content._tuiSelectedDelay);
    content._tuiSelection = {
      allowSelectedMouseUp: false,
      allowUnselectedMouseUp: false,
      dragY: 0,
    };
    content.style.visibility = "";
    setTransitionAttribute(content, "data-starting-style", false);
    setState(content, "closed");
    setTransitionAttribute(content, "data-ending-style", true);
    content._tuiReleaseScroll?.();
    content._tuiReleaseScroll = null;
    const trigger = triggerFor(content);
    if (trigger) {
      trigger.setAttribute("aria-expanded", "false");
      trigger.removeAttribute("data-popup-open");
      trigger.removeAttribute("data-pressed");
    }
    clearTimeout(content._tuiHide);
    // Aligned mode has no exit animation (animate-none, like shadcn) — hide
    // immediately instead of waiting for one.
    const popup = popupFor(content);
    if (popup && popup.getAttribute("data-align-trigger") === "true") {
      content.hidden = true;
      setTransitionAttribute(content, "data-ending-style", false);
      return;
    }
    content._tuiHide = setTimeout(() => {
      if (content.hasAttribute("data-closed") && !content.hidden) {
        content.hidden = true;
        setTransitionAttribute(content, "data-ending-style", false);
      }
    }, EXIT_MS);
  }

  function closeAll() {
    allContents().forEach(close);
  }

  function requestOpenChange(content, nextOpen, openMethod) {
    if (!content || isOpen(content) === nextOpen) return false;
    const accepted = content.dispatchEvent(
      new CustomEvent("select-open-change", {
        bubbles: true,
        cancelable: true,
        detail: {
          open: nextOpen,
          openMethod: nextOpen ? openMethod || "programmatic" : null,
        },
      }),
    );
    if (!accepted || content.hasAttribute("data-tui-select-open-controlled")) return false;
    const trigger = triggerFor(content);
    if (nextOpen && trigger) open(content, trigger, openMethod);
    else if (!nextOpen) close(content);
    return true;
  }

  function requestCloseAll() {
    allContents().forEach((content) => requestOpenChange(content, false));
  }

  function selectItem(content, item) {
    const trigger = triggerFor(content);
    if (!trigger) return;
  if (trigger.getAttribute("aria-readonly") === "true") return;
    const value = item.getAttribute("data-tui-select-value") || "";
    const label =
      item.getAttribute("data-tui-select-label") ||
      (item.querySelector("[data-tui-select-item-text]") || item).textContent.trim();

    const accepted = trigger.dispatchEvent(
      new CustomEvent("select-change", {
        bubbles: true,
        cancelable: true,
        detail: { value: value, label: label },
      }),
    );
    if (!accepted) return;

    if (!trigger.hasAttribute("data-tui-select-value-controlled")) {
      content.querySelectorAll("[data-tui-select-item]").forEach((i) => {
      i.removeAttribute("data-selected");
      i.setAttribute("aria-selected", "false");
      });
      item.setAttribute("data-selected", "");
      item.setAttribute("aria-selected", "true");

      const span = valueSpanFor(trigger);
      if (span) span.textContent = label;
      trigger.removeAttribute("data-placeholder");

      const input = inputFor(trigger);
      if (input && input.value !== value) {
        input.value = value;
        input.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }
    requestOpenChange(content, false);
    trigger.focus();
  }

  // Shows the selected item's label in the trigger (server only knows the
  // value, the label lives in the item). Runs on load and whenever new selects
  // appear in the DOM (e.g. content swapped in by a library like htmx) — the
  // MutationObserver keeps this framework-agnostic.
  function init() {
    document.querySelectorAll("[data-tui-select-trigger]").forEach(listenForEscape);
    removeOrphanedContents();
    document.querySelectorAll("[data-tui-select-trigger]").forEach((trigger) => {
      const content = contentFor(trigger);
      if (!content) return;
      const checked = content.querySelector('[data-tui-select-item][data-selected]');
      if (checked) {
        const label =
          checked.getAttribute("data-tui-select-label") ||
          (checked.querySelector("[data-tui-select-item-text]") || checked).textContent.trim();
        const span = valueSpanFor(trigger);
        if (span && span.textContent.trim() !== label) span.textContent = label;
        if (trigger.hasAttribute("data-placeholder")) trigger.removeAttribute("data-placeholder");
      }
      if (content.getAttribute("data-tui-select-initial-open") === "true") {
        content.removeAttribute("data-tui-select-initial-open");
        const openMethod =
          content.getAttribute("data-tui-select-initial-open-method") || "programmatic";
        open(content, trigger, openMethod);
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
  // Re-init on any childList mutation, directly (never rAF-deferred: rAF
  // does not fire in hidden tabs or throttled iframes): swapped-in markup
  // wires itself, removals release portaled content through the
  // ownership sweep.
  new MutationObserver(() => init()).observe(document.body, { childList: true, subtree: true });

  // ----- events -------------------------------------------------------------

  // Pointer interactions toggle and dismiss on PRESS, exactly like Base UI.
  // Click is never used for open/close, so the stray click the browser fires
  // on <body> after the menu opened over the trigger is naturally harmless.
  function toggle(trigger, openMethod) {
    const content = contentFor(trigger);
    if (!content) return;
    requestOpenChange(content, !isOpen(content), openMethod);
  }

  // Pendant of floating-ui useClick's pointerTypeRef: pointerdown marks the
  // trigger, the click that follows the same press is skipped. A click
  // without the mark (a <label for> forward, keyboard activation, or a
  // programmatic .click()) toggles instead.
  const pressedTriggers = new WeakSet();

  function isMouseWithinBounds(e, el) {
    const rect = el.getBoundingClientRect();
    return (
      e.clientX >= rect.left &&
      e.clientX <= rect.right &&
      e.clientY >= rect.top &&
      e.clientY <= rect.bottom
    );
  }

  // Pendant of SelectTrigger's mousedown handler: the press that opened the
  // popup cancels the open again when released outside the trigger and the
  // popup positioner.
  function armCancelOpen(trigger, content) {
    // Firefox can fire the mouseup upon mousedown, hence the deferred attach.
    setTimeout(() => {
      document.addEventListener(
        "mouseup",
        (e) => {
          const target = e.target instanceof Element ? e.target : null;
          // Don't treat the release as an outside press when it lands on the
          // trigger or inside the popup (or their children).
          if (target && (trigger.contains(target) || content.contains(target))) return;
          if (isMouseWithinBounds(e, trigger)) return;
          close(content);
        },
        { once: true },
      );
    }, 0);
  }

  document.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 || !(e.target instanceof Element)) return;
    const trigger = e.target.closest("[data-tui-select-trigger]");
    if (trigger) {
      // Touch opens on the click that fires at release (Base UI opens on
      // the compat mousedown, which for touch also fires post-touchend).
      // Opening at press would put the aligned popup under the still-down
      // finger, and the tap's click, hit-tested at the release point,
      // would land on the item above the trigger and instantly commit it.
      trigger._tuiOpenMethod = e.pointerType;
      if (e.pointerType === "touch") return;
      pressedTriggers.add(trigger);
      // Keep the browser from focusing the trigger button, focus lives on
      // the selected item while the listbox is open (Base UI focus scope).
      e.preventDefault();
      if (!trigger.disabled) {
        const content = contentFor(trigger);
        if (content) {
          if (isOpen(content)) {
            requestOpenChange(content, false);
          } else {
            requestOpenChange(content, true, e.pointerType);
            armCancelOpen(trigger, content);
          }
        }
      }
      return;
    }
    // Pendant of SelectItem's allowMouseSelectionRef: a real pointer click
    // only commits when its press started on the item. The stray click the
    // browser hit-tests onto the popup that just opened over the trigger
    // (touch fires its compatibility click at the tap position) never did.
    const item = e.target.closest("[data-tui-select-item]");
    if (item) {
      item._tuiPointerType = e.pointerType;
      item._tuiAllowMouseSelection = true;
      const content = item.closest("[data-tui-select-content]");
      if (content && content._tuiSelection) content._tuiSelection.dragY = 0;
    }
    if (!e.target.closest("[data-tui-select-content]")) requestCloseAll();
  });

  document.addEventListener("pointerover", (e) => {
    if (!(e.target instanceof Element)) return;
    const item = e.target.closest("[data-tui-select-item]");
    if (item) item._tuiPointerType = e.pointerType;
  });

  document.addEventListener("pointercancel", (e) => {
    if (!(e.target instanceof Element)) return;
    const trigger = e.target.closest("[data-tui-select-trigger]");
    if (!trigger) return;
    trigger._tuiOpenMethod = null;
    pressedTriggers.delete(trigger);
  });

  document.addEventListener("click", (e) => {
    if (!(e.target instanceof Element)) return;
    const trigger = e.target.closest("[data-tui-select-trigger]");
    if (trigger) {
      if (pressedTriggers.has(trigger)) {
        pressedTriggers.delete(trigger);
        return;
      }
      const openMethod = trigger._tuiOpenMethod || (e.detail === 0 ? "keyboard" : "mouse");
      trigger._tuiOpenMethod = null;
      if (!trigger.disabled) {
        toggle(trigger, openMethod);
      }
      return;
    }

    const item = e.target.closest("[data-tui-select-item]");
    if (item) {
      const content = item.closest("[data-tui-select-content]");
      if (!content) return;
      // Virtual clicks (detail 0: keyboard, assistive technology, .click())
      // represent explicit activation and always commit; so do touch clicks,
      // whose press necessarily started on the item.
      const isMouseClick = (item._tuiPointerType || "mouse") !== "touch";
      const isVirtualClick = e.detail === 0;
      const isInvalidMouseClick =
        isMouseClick && !isVirtualClick && !item._tuiAllowMouseSelection;
      item._tuiAllowMouseSelection = false;
      if (item.hasAttribute("data-disabled") || isInvalidMouseClick) return;
      selectItem(content, item);
    }
  });

  // Pendant of SelectItem's mouseup: releasing a press that started on the
  // trigger commits the item under the pointer (press trigger, drag, release
  // to select), once the SELECTED_DELAY / drag guards allow it. Touch never
  // selects on mouseup, only on click.
  document.addEventListener("mouseup", (e) => {
    if (!(e.target instanceof Element)) return;
    const item = e.target.closest("[data-tui-select-item]");
    if (!item) return;
    const content = item.closest("[data-tui-select-content]");
    const selection = content && content._tuiSelection;
    if (!selection) return;
    selection.dragY = 0;
    if (item.hasAttribute("data-disabled") || item._tuiPointerType === "touch") return;
    // Regular clicks are committed by the click event.
    if (item._tuiAllowMouseSelection) return;
    const selected = item.hasAttribute("data-selected");
    if (
      (!selection.allowSelectedMouseUp && selected) ||
      (!selection.allowUnselectedMouseUp && !selected)
    ) {
      return;
    }
    item._tuiAllowMouseSelection = true;
    item.click();
    item._tuiAllowMouseSelection = false;
  });

  let typeBuffer = "";
  let typeTimer;

  document.addEventListener("keydown", (e) => {
    if (closeOnEscapeKeyDown(e)) return;
    if (!(e.target instanceof Element)) return;

    // Closed trigger: arrow keys open the listbox (Enter/Space go through
    // the native button click path).
    const trigger = e.target.closest("[data-tui-select-trigger]");
    if (trigger && !trigger.disabled) {
      pressedTriggers.delete(trigger); // like useClick's onKeyDown reset
      trigger._tuiOpenMethod = null;
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const content = contentFor(trigger);
        if (content && !isOpen(content)) requestOpenChange(content, true, "keyboard");
      }
      return;
    }

    // Open listbox: roving focus on the items.
    const item = e.target.closest("[data-tui-select-item]");
    if (!item) return;
    const content = item.closest("[data-tui-select-content]");
    if (!content) return;
    const items = [...content.querySelectorAll("[data-tui-select-item]")].filter(
      (i) => !i.hasAttribute("data-disabled"),
    );
    const index = items.indexOf(item);

    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const next = items[index + (e.key === "ArrowDown" ? 1 : -1)];
      if (next) next.focus();
    } else if (e.key === "Home" || e.key === "End") {
      e.preventDefault();
      const edge = e.key === "Home" ? items[0] : items[items.length - 1];
      if (edge) edge.focus();
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      selectItem(content, item);
    } else if (e.key === "Tab") {
      requestOpenChange(content, false);
    } else if (e.key.length === 1) {
      clearTimeout(typeTimer);
      typeBuffer += e.key.toLowerCase();
      typeTimer = setTimeout(() => {
        typeBuffer = "";
      }, 500);
      const match = items.find((i) => i.textContent.trim().toLowerCase().startsWith(typeBuffer));
      if (match) match.focus();
    }
  });

  // The highlight follows the pointer, one highlighted item at a time.
  document.addEventListener("pointermove", (e) => {
    if (!(e.target instanceof Element)) return;
    const item = e.target.closest("[data-tui-select-item]");
    if (!item) return;
    // Dragging with the button held re-arms unselected mouseup selection
    // before SELECTED_DELAY has elapsed, once the drag covers >= 8px.
    if (e.pointerType === "mouse" && e.buttons === 1) {
      const content = item.closest("[data-tui-select-content]");
      if (content && content._tuiSelection) {
        content._tuiSelection.dragY += e.movementY;
        if (content._tuiSelection.dragY ** 2 >= 64) {
          content._tuiSelection.allowUnselectedMouseUp = true;
        }
      }
    }
    if (!item.hasAttribute("data-disabled") && document.activeElement !== item) {
      item.focus({ preventScroll: true });
    }
  });

  window.addEventListener(
    "scroll",
    (e) => {
      const inMenu = e.target instanceof Element && e.target.closest("[data-tui-select-content]");
      if (inMenu) {
        if (inMenu._tuiAligned) {
          handleAlignedScroll(inMenu);
        } else {
          updateScrollArrows(inMenu);
        }
        return;
      }
    },
    true,
  );

})();

// components/sidebar/sidebar.js
(function () {
  "use strict";

  const SIDEBAR_COOKIE_NAME = "sidebar_state";
  const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days
  const MOBILE_QUERY = "(max-width: 767px)";

  function wrapperFor(sidebarId) {
    return document.querySelector(
      '[data-tui-sidebar-wrapper][data-tui-sidebar-id="' + sidebarId + '"]',
    );
  }

  // SidebarProvider.openMobile survives the Sheet's viewport-driven unmount.
  function openMobileOf(sidebarId) {
    return !!anyWrapper(sidebarId)?.hasAttribute("data-tui-sidebar-open-mobile");
  }

  // SidebarProvider.setOpenMobile: state is independent of the mounted Sheet.
  function setOpenMobile(open, sidebarId) {
    const wrapper = anyWrapper(sidebarId);
    if (!wrapper) return;
    wrapper.toggleAttribute("data-tui-sidebar-open-mobile", !!open);
    if (!window.matchMedia(MOBILE_QUERY).matches) return;
    const popup = document.getElementById(wrapper.getAttribute("data-tui-sidebar-id") + "-mobile");
    const dialog = window.tui?.dialog;
    if (!popup || !dialog) return;
    if (open && !dialog.isOpen(popup)) dialog.open(popup);
    else if (!open && dialog.isOpen(popup)) dialog.close(popup);
  }

  // The sidebar content renders once and moves between the desktop container
  // and the mobile sheet, depending on the viewport.
  function init() {
    document.querySelectorAll("[data-tui-sidebar-content]").forEach((content) => {
      const sidebarId = content.getAttribute("data-tui-sidebar-content");
      const portal = document.querySelector(
        '[data-tui-sidebar-mobile-portal="' + sidebarId + '"]',
      );
      if (!portal) return;

      const isMobile = window.matchMedia(MOBILE_QUERY).matches;

      if (isMobile && content.parentElement !== portal) {
        portal.appendChild(content);
      } else if (!isMobile && content.parentElement === portal) {
        const inner = wrapperFor(sidebarId)?.querySelector('[data-slot="sidebar-inner"]');
        if (inner) inner.appendChild(content);
      }

      // Mount/unmount the Sheet with open={openMobile}, as in shadcn's Sidebar.
      const popup = document.getElementById(sidebarId + "-mobile");
      const dialog = window.tui?.dialog;
      if (!popup || !dialog) return;
      if (isMobile && openMobileOf(sidebarId) && !dialog.isOpen(popup)) {
        dialog.open(popup);
      } else if (!isMobile && dialog.isOpen(popup)) {
        dialog.close(popup);
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
  window.addEventListener("resize", init);
  // Re-init on any childList mutation, directly (never rAF-deferred: rAF
  // does not fire in hidden tabs or throttled iframes): swapped-in markup
  // wires itself.
  new MutationObserver(() => init()).observe(document.body, { childList: true, subtree: true });

  function toggleSidebar(sidebarId) {
    // shadcn's toggleSidebar: setOpenMobile((open) => !open) below md.
    if (window.matchMedia(MOBILE_QUERY).matches) {
      setOpenMobile(!openMobileOf(sidebarId), sidebarId);
      return;
    }

    const wrapper = wrapperFor(sidebarId);
    if (!wrapper) return;
    const mode = wrapper.getAttribute("data-tui-sidebar-collapsible-mode");
    if (mode === "none") return;

    const collapsed = wrapper.getAttribute("data-state") !== "collapsed";
    wrapper.setAttribute("data-state", collapsed ? "collapsed" : "expanded");
    // Like shadcn, data-collapsible carries the mode only while collapsed,
    // so icon/offcanvas selectors need no extra state check.
    wrapper.setAttribute("data-collapsible", collapsed ? mode : "");

    // Menu button tooltips only show while collapsed to icons.
    const tooltipsDisabled = !(collapsed && mode === "icon");
    wrapper.querySelectorAll("[data-tui-tooltip-trigger]").forEach((trigger) => {
      // An explicit tooltip.hidden pendant pins the state.
      if (trigger.hasAttribute("data-tui-sidebar-tooltip-fixed")) return;
      trigger.toggleAttribute("data-tui-tooltip-disabled", tooltipsDisabled);
    });

    document.cookie =
      SIDEBAR_COOKIE_NAME +
      "=" +
      (collapsed ? "false" : "true") +
      "; path=/; max-age=" +
      SIDEBAR_COOKIE_MAX_AGE;
  }

  document.addEventListener("click", (e) => {
    if (!(e.target instanceof Element)) return;
    const trigger = e.target.closest("[data-tui-sidebar-trigger]");
    if (!trigger) return;
    const targetId = trigger.getAttribute("data-tui-sidebar-target");
    if (targetId) toggleSidebar(targetId);
  });

  // Sheet onOpenChange={setOpenMobile}; unmount closes do not change state.
  document.addEventListener("dialog-open-change", (event) => {
    if (!(event.target instanceof Element)) return;
    const id = event.target.id;
    if (!id.endsWith("-mobile")) return;
    const sidebarId = id.slice(0, -"-mobile".length);
    if (wrapperFor(sidebarId)) setOpenMobile(event.detail.open, sidebarId);
  });

  // The useSidebar pendant: the same seven members as the React hook,
  // addressing the first sidebar unless a sidebarId is given.
  function anyWrapper(sidebarId) {
    return sidebarId
      ? wrapperFor(sidebarId)
      : document.querySelector("[data-tui-sidebar-wrapper]");
  }

  window.tui = window.tui || {};
  window.tui.sidebar = {
    state(sidebarId) {
      return anyWrapper(sidebarId)?.getAttribute("data-state") || null;
    },
    open(sidebarId) {
      return this.state(sidebarId) === "expanded";
    },
    setOpen(open, sidebarId) {
      const wrapper = anyWrapper(sidebarId);
      if (!wrapper) return;
      if (this.open(sidebarId) !== open) {
        toggleSidebar(wrapper.getAttribute("data-tui-sidebar-id"));
      }
    },
    openMobile(sidebarId) {
      return openMobileOf(sidebarId);
    },
    setOpenMobile(open, sidebarId) {
      setOpenMobile(open, sidebarId);
    },
    isMobile() {
      return window.matchMedia(MOBILE_QUERY).matches;
    },
    toggleSidebar(sidebarId) {
      const wrapper = anyWrapper(sidebarId);
      if (wrapper) toggleSidebar(wrapper.getAttribute("data-tui-sidebar-id"));
    },
  };

  // Cmd/Ctrl + shortcut key toggles the sidebar.
  document.addEventListener("keydown", (e) => {
    if (!(e.ctrlKey || e.metaKey) || e.key.length !== 1) return;
    const wrapper = document.querySelector("[data-tui-sidebar-wrapper]");
    if (!wrapper) return;
    const shortcut = wrapper.getAttribute("data-tui-sidebar-keyboard-shortcut");
    if (!shortcut || shortcut.toLowerCase() !== e.key.toLowerCase()) return;
    e.preventDefault();
    toggleSidebar(wrapper.getAttribute("data-tui-sidebar-id"));
  });
})();

// components/slider/slider.js
(function () {
  "use strict";

  // size-3 in px; Base UI's edge thumb alignment keeps the thumb inside the
  // track by shifting it up to its own width. Mirrors slider.templ.
  const THUMB = 12;

  function config(root) {
    return {
      min: parseFloat(root.getAttribute("data-min") || "0"),
      max: parseFloat(root.getAttribute("data-max") || "100"),
      step: parseFloat(root.getAttribute("data-step") || "1") || 1,
      vertical: root.hasAttribute("data-vertical"),
    };
  }

  function thumbsOf(root) {
    return [...root.querySelectorAll("[data-tui-slider-thumb]")];
  }

  function valuesOf(root) {
    return thumbsOf(root).map((t) => parseFloat(t.getAttribute("aria-valuenow") || "0"));
  }

  function fraction(v, c) {
    if (c.max === c.min) return 0;
    return Math.min(1, Math.max(0, (v - c.min) / (c.max - c.min)));
  }

  function decimals(step) {
    const s = String(step);
    const i = s.indexOf(".");
    return i === -1 ? 0 : s.length - i - 1;
  }

  function render(root) {
    const c = config(root);
    const values = valuesOf(root);
    thumbsOf(root).forEach((t, i) => {
      const f = fraction(values[i], c);
      if (c.vertical) {
        const g = 1 - f;
        t.style.top = "calc(" + (g * 100).toFixed(4) + "% - " + (g * THUMB).toFixed(2) + "px)";
      } else {
        t.style.left = "calc(" + (f * 100).toFixed(4) + "% - " + (f * THUMB).toFixed(2) + "px)";
      }
    });
    const range = root.querySelector("[data-tui-slider-range]");
    if (range) {
      const fs = values.map((v) => fraction(v, c));
      const lo = values.length > 1 ? Math.min(...fs) : 0;
      const hi = values.length > 0 ? Math.max(...fs) : 0;
      if (c.vertical) {
        if (values.length > 1) {
          range.style.bottom = "calc(" + (lo * 100).toFixed(4) + "% + " + (THUMB / 2 - lo * THUMB).toFixed(2) + "px)";
          range.style.height = "calc(" + ((hi - lo) * 100).toFixed(4) + "% - " + ((hi - lo) * THUMB).toFixed(2) + "px)";
        } else {
          range.style.bottom = "0";
          range.style.height = "calc(" + (hi * 100).toFixed(4) + "% + " + (THUMB / 2 - hi * THUMB).toFixed(2) + "px)";
        }
      } else {
        if (values.length > 1) {
          range.style.left = "calc(" + (lo * 100).toFixed(4) + "% + " + (THUMB / 2 - lo * THUMB).toFixed(2) + "px)";
          range.style.width = "calc(" + ((hi - lo) * 100).toFixed(4) + "% - " + ((hi - lo) * THUMB).toFixed(2) + "px)";
        } else {
          range.style.left = "0";
          range.style.width = "calc(" + (hi * 100).toFixed(4) + "% + " + (THUMB / 2 - hi * THUMB).toFixed(2) + "px)";
        }
      }
    }
    root.querySelectorAll("[data-tui-slider-input]").forEach((input, i) => {
      if (values[i] != null) input.value = String(values[i]);
    });
  }

  function snap(v, c) {
    const stepped = Math.round((v - c.min) / c.step) * c.step + c.min;
    const clamped = Math.min(c.max, Math.max(c.min, stepped));
    return parseFloat(clamped.toFixed(decimals(c.step)));
  }

  function setValue(root, index, v) {
    const c = config(root);
    const values = valuesOf(root);
    v = snap(v, c);
    // Thumbs cannot cross each other (Base UI clamps at the neighbor).
    if (index > 0) v = Math.max(v, values[index - 1]);
    if (index < values.length - 1) v = Math.min(v, values[index + 1]);
    if (values[index] === v) return;
  const nextValues = values.slice();
  nextValues[index] = v;
  const change = new CustomEvent("slider-change", {
    bubbles: true,
    cancelable: true,
    detail: { values: nextValues },
  });
  const accepted = root.dispatchEvent(change);
  if (!accepted || root.hasAttribute("data-tui-slider-controlled")) return;
    thumbsOf(root)[index].setAttribute("aria-valuenow", String(v));
    render(root);
  }

  // Inverts the edge alignment: the usable span is the track minus one thumb.
  function valueFromPointer(root, e) {
    const c = config(root);
    const track = root.querySelector("[data-tui-slider-track]");
    const rect = track.getBoundingClientRect();
    let f;
    if (c.vertical) {
      const usable = rect.height - THUMB;
      f = usable <= 0 ? 0 : (rect.bottom - THUMB / 2 - e.clientY) / usable;
    } else {
      const usable = rect.width - THUMB;
      f = usable <= 0 ? 0 : (e.clientX - rect.left - THUMB / 2) / usable;
    }
    return c.min + Math.min(1, Math.max(0, f)) * (c.max - c.min);
  }

  function nearestThumb(root, v) {
    const values = valuesOf(root);
    let best = 0;
    let bestDist = Infinity;
    values.forEach((val, i) => {
      const d = Math.abs(val - v);
      // On a tie the upper thumb moves when pressing above it.
      if (d < bestDist || (d === bestDist && v > val)) {
        best = i;
        bestDist = d;
      }
    });
    return best;
  }

  let drag = null; // { root, index }

  document.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 || !(e.target instanceof Element)) return;
    const control = e.target.closest("[data-tui-slider-control]");
    if (!control) return;
    const root = control.closest("[data-tui-slider]");
    if (!root || root.hasAttribute("data-disabled")) return;
    e.preventDefault();
    const v = valueFromPointer(root, e);
    const pressedThumb = e.target.closest("[data-tui-slider-thumb]");
    const index = pressedThumb ? thumbsOf(root).indexOf(pressedThumb) : nearestThumb(root, v);
    drag = { root, index };
    if (!pressedThumb) setValue(root, index, v);
    thumbsOf(root)[index].focus({ preventScroll: true });
  });

  document.addEventListener("pointermove", (e) => {
    if (!drag) return;
    setValue(drag.root, drag.index, valueFromPointer(drag.root, e));
  });

  document.addEventListener("pointerup", () => {
    drag = null;
  });

  document.addEventListener("keydown", (e) => {
    if (!(e.target instanceof Element)) return;
    const thumb = e.target.closest("[data-tui-slider-thumb]");
    if (!thumb) return;
    const root = thumb.closest("[data-tui-slider]");
    if (!root || root.hasAttribute("data-disabled")) return;
    const c = config(root);
    const index = thumbsOf(root).indexOf(thumb);
    const v = valuesOf(root)[index];
    let next = null;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") next = v + c.step;
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") next = v - c.step;
    if (e.key === "PageUp") next = v + c.step * 10;
    if (e.key === "PageDown") next = v - c.step * 10;
    if (e.key === "Home") next = c.min;
    if (e.key === "End") next = c.max;
    if (next === null) return;
    e.preventDefault();
    setValue(root, index, next);
  });
})();

// components/switch/switch.js
(function () {
  "use strict";

  // Vanilla port of Base UI's switch: the root span behavior comes from
  // switch/root/SwitchRoot.tsx, the non-native button keyboard semantics from
  // internals/use-button/useButton.ts. Clicks, Enter and Space forward to the
  // visually hidden native checkbox beside the root; the input's change event
  // syncs the state attributes back onto the root and thumb.

  function inputOf(root) {
    const next = root.nextElementSibling;
    return next && next.matches("[data-tui-switch-input]") ? next : null;
  }

  function rootOf(input) {
    const prev = input.previousElementSibling;
    return prev && prev.matches("[data-tui-switch]") ? prev : null;
  }

  function isDisabled(root, input) {
    return (input && input.disabled) || root.getAttribute("aria-disabled") === "true";
  }

  function isReadOnly(root) {
    return root.getAttribute("aria-readonly") === "true";
  }

  // Port of utils/dispatchClickWithModifiers.ts: the constructed click keeps
  // the source event's modifier state and still runs native activation
  // behavior (toggling the input).
  function forwardClick(target, sourceEvent) {
    target.dispatchEvent(
      new PointerEvent("click", {
        bubbles: true,
        cancelable: true,
        composed: true,
        detail: 0,
        shiftKey: sourceEvent.shiftKey,
        ctrlKey: sourceEvent.ctrlKey,
        altKey: sourceEvent.altKey,
        metaKey: sourceEvent.metaKey,
      }),
    );
  }

  function sync(root, input) {
    const checked = input.checked;
    root.setAttribute("aria-checked", String(checked));
    root.toggleAttribute("data-checked", checked);
    root.toggleAttribute("data-unchecked", !checked);
    // Base UI mirrors the state onto the thumb via the stateAttributesMapping.
    const thumb = root.querySelector('[data-slot="switch-thumb"]');
    if (thumb) {
      thumb.toggleAttribute("data-checked", checked);
      thumb.toggleAttribute("data-unchecked", !checked);
    }
  }

  function requestCheckedChange(root, input, sourceEvent) {
    const nextChecked = !input.checked;
    const change = new CustomEvent("switch-change", {
      bubbles: true,
      cancelable: true,
      detail: { checked: nextChecked },
    });
    root.dispatchEvent(change);
    if (change.defaultPrevented || root.hasAttribute("data-tui-switch-controlled")) return;
    forwardClick(input, sourceEvent);
  }

  // SwitchRoot onClick: cancel the click's default (a wrapping label would
  // otherwise forward it to the input a second time) and toggle through the
  // hidden input so the native change event fires.
  document.addEventListener("click", (e) => {
    const root = e.target.closest && e.target.closest("[data-tui-switch]");
    if (!root) return;
    const input = inputOf(root);
    if (!input) return;
    if (isDisabled(root, input)) {
      // useButton prevents clicks on disabled non-native buttons.
      e.preventDefault();
      return;
    }
    if (isReadOnly(root)) return;
    e.preventDefault();
    requestCheckedChange(root, input, e);
  });

  document.addEventListener("change", (e) => {
    const input = e.target;
    if (!input.matches || !input.matches("[data-tui-switch-input]")) return;
    const root = rootOf(input);
    if (root) sync(root, input);
  });

  document.addEventListener("keydown", (e) => {
    const root = e.target;
    if (!root.matches || !root.matches("[data-tui-switch]")) return;
    if (isDisabled(root, inputOf(root))) return;
    if (e.key === "Enter") {
      // useButton: Enter activates non-native buttons on keydown.
      if (e.defaultPrevented) return;
      e.preventDefault();
      forwardClick(root, e);
    } else if (e.key === " ") {
      // useButton: Space activates on keyup; prevent the page scroll.
      e.preventDefault();
    }
  });

  // useButton keyup: Space dispatches the click on the root itself, which the
  // click handler above forwards to the input.
  document.addEventListener("keyup", (e) => {
    const root = e.target;
    if (!root.matches || !root.matches("[data-tui-switch]")) return;
    if (e.key !== " " || e.defaultPrevented) return;
    if (isDisabled(root, inputOf(root))) return;
    forwardClick(root, e);
  });

  // Focus on the hidden input (label clicks, programmatic focus) belongs on
  // the root (SwitchRoot's input onFocus).
  document.addEventListener("focusin", (e) => {
    const input = e.target;
    if (!input.matches || !input.matches("[data-tui-switch-input]")) return;
    const root = rootOf(input);
    if (root) root.focus();
  });

  let labelId = 0;

  function setup(root) {
    if (root.hasAttribute("data-tui-switch-initialized")) return;
    root.setAttribute("data-tui-switch-initialized", "");
    const input = inputOf(root);
    if (!input) return;
    // The clicks dispatched on the hidden input are an implementation detail
    // and must not reach ancestors, which already receive the original click
    // (SwitchRoot's input onClick).
    input.addEventListener("click", (e) => e.stopPropagation());
    // useAriaLabelledBy fallback: the span control is labelled by the native
    // label associated with the hidden input.
    if (!root.hasAttribute("aria-labelledby") && !root.hasAttribute("aria-label")) {
      const label =
        input.parentElement && input.parentElement.tagName === "LABEL"
          ? input.parentElement
          : input.labels && input.labels[0];
      if (label) {
        if (!label.id) {
          labelId += 1;
          label.id = (input.id || "tui-switch-" + labelId) + "-label";
        }
        root.setAttribute("aria-labelledby", label.id);
      }
    }
    sync(root, input);
  }

  function init() {
    document.querySelectorAll("[data-tui-switch]").forEach(setup);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
  // Re-init on any childList mutation, directly (never rAF-deferred: rAF
  // does not fire in hidden tabs or throttled iframes): swapped-in markup
  // wires itself.
  new MutationObserver(() => init()).observe(document.body, { childList: true, subtree: true });
})();

// components/tabs/tabs.js
(function () {
  "use strict";

  // Update tab state
  function setActiveTab(tabsId, value) {
  const root = document.querySelector(
    `[data-tui-tabs][data-tui-tabs-id="${tabsId}"]`,
  );
  if (root) root.setAttribute("data-tui-tabs-value", value || "");
    // Update all triggers with this tabs-id
    document
      .querySelectorAll(`[data-tui-tabs-trigger][data-tui-tabs-id="${tabsId}"]`)
      .forEach((trigger) => {
        const isActive = trigger.getAttribute("data-tui-tabs-value") === value;
        trigger.setAttribute(
          "data-tui-tabs-state",
          isActive ? "active" : "inactive",
        );
        // Base UI marks the selected tab with a bare data-active attribute;
        // the styles select on it.
        trigger.toggleAttribute("data-active", isActive);
        // The ARIA state moves with the visual one, and the roving tabindex
        // keeps the list a single tab stop.
        trigger.setAttribute("aria-selected", isActive ? "true" : "false");
        trigger.setAttribute("tabindex", isActive ? "0" : "-1");
      });

    // Update all contents with this tabs-id
    document
      .querySelectorAll(`[data-tui-tabs-content][data-tui-tabs-id="${tabsId}"]`)
      .forEach((content) => {
        const isActive = content.getAttribute("data-tui-tabs-value") === value;
        content.setAttribute(
          "data-tui-tabs-state",
          isActive ? "active" : "inactive",
        );
        content.classList.toggle("hidden", !isActive);
        content.setAttribute("tabindex", isActive ? "0" : "-1");
      });
  }

  function requestValueChange(root, value) {
    if (!root || root.getAttribute("data-tui-tabs-value") === value) return;
    const accepted = root.dispatchEvent(
      new CustomEvent("tabs-value-change", {
        bubbles: true,
        cancelable: true,
        detail: { value },
      }),
    );
    if (!accepted || root.hasAttribute("data-tui-tabs-controlled")) return;
    setActiveTab(root.getAttribute("data-tui-tabs-id"), value);
  }

  // Click handler
  document.addEventListener("click", (e) => {
    const trigger = e.target.closest("[data-tui-tabs-trigger]");
    if (!trigger || trigger.getAttribute("aria-disabled") === "true") return;

    const tabsId = trigger.getAttribute("data-tui-tabs-id");
    const value = trigger.getAttribute("data-tui-tabs-value");
    if (tabsId && value) {
    const root = trigger.closest("[data-tui-tabs]");
    requestValueChange(root, value);
    }
  });

  // Keyboard navigation from useTabsList: the arrows walk the list, Home and
  // End jump to its ends, disabled tabs stay focusable and movement wraps.
  //
  // Moving focus does not activate. That is Base UI's activateOnFocus=false
  // default, and the right one here: a panel is free to load its content when
  // it becomes active, and selecting on every keystroke would fire a request
  // per arrow press. Enter and Space activate, through the native button
  // click the click handler above already answers. Set ActivateOnFocus on the
  // list for the other behaviour.
  document.addEventListener("keydown", (e) => {
    const trigger = e.target.closest && e.target.closest("[data-tui-tabs-trigger]");
    if (!trigger) return;
    const root = trigger.closest("[data-tui-tabs]");
    if (!root) return;

    // In a horizontal list the arrows follow the writing direction.
    const vertical = root.getAttribute("data-orientation") === "vertical";
    const rtl = getComputedStyle(root).direction === "rtl";
    const prev = vertical ? "ArrowUp" : rtl ? "ArrowRight" : "ArrowLeft";
    const next = vertical ? "ArrowDown" : rtl ? "ArrowLeft" : "ArrowRight";

    const triggers = [...root.querySelectorAll("[data-tui-tabs-trigger]")];
    const current = triggers.indexOf(trigger);
    if (current === -1) return;

    let target = null;
    if (e.key === next) target = triggers[(current + 1) % triggers.length];
    else if (e.key === prev)
      target = triggers[(current - 1 + triggers.length) % triggers.length];
    else if (e.key === "Home") target = triggers[0];
    else if (e.key === "End") target = triggers[triggers.length - 1];
    if (!target) return;

    e.preventDefault(); // the arrows would otherwise scroll the page

    const list = trigger.closest("[data-tui-tabs-list]");
    if (
      list && list.hasAttribute("data-activate-on-focus") &&
      target.getAttribute("aria-disabled") !== "true"
    ) {
      // setActiveTab moves the roving tabindex with the selection.
      setActiveTab(
        target.getAttribute("data-tui-tabs-id"),
        target.getAttribute("data-tui-tabs-value"),
      );
    } else {
      // Focus moves without selecting, so the roving tabindex has to follow
      // the focus instead: tabbing away and back returns to where the user
      // was, not to the selected tab.
      triggers.forEach((t) => t.setAttribute("tabindex", t === target ? "0" : "-1"));
    }
    target.focus();
  });

  // Initialize active states
  function init() {
    document.querySelectorAll("[data-tui-tabs]").forEach((container) => {
      const tabsId = container.getAttribute("data-tui-tabs-id");
      if (!tabsId) return;

      // Find active trigger or use first
    const authored = container.querySelector(
    `[data-tui-tabs-trigger][data-tui-tabs-state="active"]`,
    );
    const activeTrigger =
    authored ||
    (container.hasAttribute("data-tui-tabs-controlled")
      ? null
      : container.querySelector(`[data-tui-tabs-trigger]:not([aria-disabled="true"])`));

      if (activeTrigger) {
        setActiveTab(tabsId, activeTrigger.getAttribute("data-tui-tabs-value"));
      }
    });
  }

  // Setup on load and mutations
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
  // Re-init on any childList mutation, directly (never rAF-deferred: rAF
  // does not fire in hidden tabs or throttled iframes): swapped-in markup
  // wires itself.
  new MutationObserver(() => init()).observe(document.body, { childList: true, subtree: true });

  // Expose public API
  window.tui = window.tui || {};
  window.tui.tabs = {
    setActive: setActiveTab,
  };
})();

// components/toast/toast.js
(function () {
  "use strict";

  // Vanilla port of shadcn's base/toast (Base UI Toast): the class strings,
  // CSS variables and stacking behavior mirror components/ui/toast.tsx.

  var ENTER_EXIT_MS = 500;
  var SWIPE_THRESHOLD = 45;
  var GAP = 12; // --gap: 0.75rem

  var TOAST_CLASS = [
    "rounded-2xl group/toast pointer-events-auto absolute right-0 bottom-0 z-[calc(1000-var(--toast-index))] w-full origin-bottom border bg-popover text-popover-foreground shadow-lg will-change-transform outline-none select-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
    "[--gap:0.75rem] [--height:var(--toast-frontmost-height,var(--toast-height))] [--offset-y:calc(var(--toast-offset-y)*-1+calc(var(--toast-index)*var(--gap)*-1)+var(--toast-swipe-movement-y))] [--peek:0.75rem] [--scale:calc(max(0,1-(var(--toast-index)*0.1)))] [--shrink:calc(1-var(--scale))]",
    "h-(--height) [transform:translateX(var(--toast-swipe-movement-x))_translateY(calc(var(--toast-swipe-movement-y)-(var(--toast-index)*var(--peek))-(var(--shrink)*var(--height))))_scale(var(--scale))] [transition:transform_500ms_cubic-bezier(0.22,1,0.36,1),opacity_500ms,height_150ms]",
    "after:absolute after:top-full after:left-0 after:h-[calc(var(--gap)+1px)] after:w-full after:content-['']",
    "data-expanded:h-(--toast-height) data-expanded:[transform:translateX(var(--toast-swipe-movement-x))_translateY(var(--offset-y))]",
    "data-limited:opacity-0 data-starting-style:[transform:translateY(150%)]",
    "[&[data-ending-style]:not([data-limited]):not([data-swipe-direction])]:[transform:translateY(150%)]",
    "data-ending-style:data-[swipe-direction=down]:[transform:translateY(calc(var(--toast-swipe-movement-y)+150%))]",
    "data-ending-style:data-[swipe-direction=left]:[transform:translateX(calc(var(--toast-swipe-movement-x)-150%))_translateY(var(--offset-y))]",
    "data-ending-style:data-[swipe-direction=right]:[transform:translateX(calc(var(--toast-swipe-movement-x)+150%))_translateY(var(--offset-y))]",
    "data-ending-style:data-[swipe-direction=up]:[transform:translateY(calc(var(--toast-swipe-movement-y)-150%))]",
    "data-expanded:data-ending-style:data-[swipe-direction=down]:[transform:translateY(calc(var(--toast-swipe-movement-y)+150%))]",
    "data-expanded:data-ending-style:data-[swipe-direction=left]:[transform:translateX(calc(var(--toast-swipe-movement-x)-150%))_translateY(var(--offset-y))]",
    "data-expanded:data-ending-style:data-[swipe-direction=right]:[transform:translateX(calc(var(--toast-swipe-movement-x)+150%))_translateY(var(--offset-y))]",
    "data-expanded:data-ending-style:data-[swipe-direction=up]:[transform:translateY(calc(var(--toast-swipe-movement-y)-150%))]",
  ].join(" ");

  var CONTENT_CLASS =
    "flex h-full items-center gap-3 overflow-hidden p-4 transition-opacity duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] data-behind:opacity-0 data-expanded:opacity-100";
  var TITLE_CLASS = "text-sm font-medium";
  var DESCRIPTION_CLASS = "text-sm text-muted-foreground";
  var ICON_CLASS =
    "shrink-0 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4";

  // The Button component's classes, resolved for variant outline size sm
  // (ToastAction) and variant ghost size icon-sm (ToastClose): the base is
  // button.templ's baseClasses, the look comes from the classes.
  var BUTTON_BASE =
    "focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 rounded-md border border-transparent bg-clip-padding text-sm font-medium focus-visible:ring-3 aria-invalid:ring-3 active:not-aria-[haspopup]:translate-y-px [&_svg:not([class*='size-'])]:size-4 group/button inline-flex shrink-0 items-center justify-center whitespace-nowrap transition-all outline-none select-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0";
  var ACTION_CLASS = [BUTTON_BASE, "border-border bg-background hover:bg-muted hover:text-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 aria-expanded:bg-muted aria-expanded:text-foreground shadow-xs h-8 gap-1 rounded-[min(var(--radius-md),10px)] px-2.5 in-data-[slot=button-group]:rounded-md has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 shrink-0"].join(" ");
  var CLOSE_CLASS = [
    BUTTON_BASE,
    "hover:bg-muted dark:hover:bg-muted/50 aria-expanded:bg-muted aria-expanded:text-foreground size-8 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-md relative shrink-0 text-muted-foreground after:absolute after:-inset-2 after:content-[''] hover:text-foreground",
  ].join(" ");

  var ICONS = {
    success:
      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>',
    info: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>',
    warning:
      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>',
    error:
      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-destructive" aria-hidden="true"><path d="M12 16h.01"/><path d="M12 8v4"/><path d="M15.312 2a2 2 0 0 1 1.414.586l4.688 4.688A2 2 0 0 1 22 8.688v6.624a2 2 0 0 1-.586 1.414l-4.688 4.688a2 2 0 0 1-1.414.586H8.688a2 2 0 0 1-1.414-.586l-4.688-4.688A2 2 0 0 1 2 15.312V8.688a2 2 0 0 1 .586-1.414l4.688-4.688A2 2 0 0 1 8.688 2z"/></svg>',
    loading:
      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="animate-spin" aria-hidden="true"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>',
    close:
      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
  };

  function viewportOf(el) {
    return el ? el.closest("[data-tui-toaster]") : document.querySelector("[data-tui-toaster]");
  }

  function toastsOf(vp) {
    // Newest first, like Base UI's toast list; leaving toasts keep animating
    // but no longer take part in the layout.
    return Array.from(vp.querySelectorAll('[data-slot="toast"]:not([data-ending-style])')).reverse();
  }

  // ----- layout: the Base UI stacking variables -----------------------------

  function layout(vp) {
    var list = toastsOf(vp);
    var limit = parseInt(vp.getAttribute("data-tui-toaster-limit"), 10) || 3;
    var expanded = vp.hasAttribute("data-expanded");

    // Natural heights first: with the per-toast vars cleared, h-(--height)
    // resolves to auto.
    list.forEach(function (t) {
      t.style.removeProperty("--toast-height");
      t.style.removeProperty("--toast-frontmost-height");
    });
    var heights = list.map(function (t) {
      return t.offsetHeight;
    });

    var offset = 0;
    list.forEach(function (t, i) {
      t.style.setProperty("--toast-index", String(i));
      t.style.setProperty("--toast-height", heights[i] + "px");
      if (i > 0) {
        t.style.setProperty("--toast-frontmost-height", heights[0] + "px");
      }
      // --toast-offset-y carries only the summed heights, the class formula
      // adds index*gap on top.
      t.style.setProperty("--toast-offset-y", offset + "px");
      offset += heights[i];
      t.toggleAttribute("data-limited", i >= limit);
      t.toggleAttribute("data-expanded", expanded);
      var content = t.querySelector('[data-slot="toast-content"]');
      if (content) {
        content.toggleAttribute("data-behind", i > 0 && !expanded);
        content.toggleAttribute("data-expanded", expanded || i === 0);
      }
    });
  }

  // ----- timers -------------------------------------------------------------

  function startTimer(t) {
    if (t.getAttribute("data-type") === "loading") return;
    var vp = viewportOf(t);
    var timeout = parseInt(t.getAttribute("data-tui-toast-timeout"), 10);
    if (!timeout) {
      timeout = parseInt(vp.getAttribute("data-tui-toaster-timeout"), 10) || 5000;
    }
    var remaining = t._tuiRemaining != null ? t._tuiRemaining : timeout;
    t._tuiDeadline = Date.now() + remaining;
    t._tuiTimer = window.setTimeout(function () {
      dismiss(t);
    }, remaining);
  }

  function stopTimer(t) {
    if (t._tuiTimer) {
      window.clearTimeout(t._tuiTimer);
      t._tuiTimer = null;
      t._tuiRemaining = Math.max(0, (t._tuiDeadline || 0) - Date.now());
    }
  }

  // ----- create / dismiss ---------------------------------------------------

  var seq = 0;

  function build(opts) {
    var t = document.createElement("div");
    t.className = TOAST_CLASS;
    t.setAttribute("data-slot", "toast");
    t.setAttribute("role", "status");
    t.setAttribute("aria-atomic", "true");
    t.id = opts.id || "tui-toast-" + ++seq;
    if (opts.type) t.setAttribute("data-type", opts.type);
    if (opts.timeout) t.setAttribute("data-tui-toast-timeout", String(opts.timeout));
    t.style.setProperty("--toast-swipe-movement-x", "0px");
    t.style.setProperty("--toast-swipe-movement-y", "0px");

    var content = document.createElement("div");
    content.className = CONTENT_CLASS;
    content.setAttribute("data-slot", "toast-content");

    var iconEl = document.createElement("span");
    iconEl.className = ICON_CLASS;
    iconEl.setAttribute("data-slot", "toast-icon");
    if (opts.type && ICONS[opts.type]) {
      iconEl.innerHTML = ICONS[opts.type];
    } else {
      iconEl.hidden = true;
    }
    content.appendChild(iconEl);

    var textWrap = document.createElement("div");
    textWrap.className = "flex min-w-0 flex-1 flex-col gap-1";
    var titleEl = document.createElement("div");
    titleEl.className = TITLE_CLASS;
    titleEl.setAttribute("data-slot", "toast-title");
    if (opts.title) titleEl.textContent = opts.title;
    else titleEl.hidden = true;
    var descEl = document.createElement("div");
    descEl.className = DESCRIPTION_CLASS;
    descEl.setAttribute("data-slot", "toast-description");
    if (opts.description) descEl.textContent = opts.description;
    else descEl.hidden = true;
    textWrap.appendChild(titleEl);
    textWrap.appendChild(descEl);
    content.appendChild(textWrap);

    if (opts.action) {
      var actionEl = document.createElement("button");
      actionEl.type = "button";
      actionEl.className = ACTION_CLASS;
      actionEl.setAttribute("data-slot", "toast-action");
      actionEl.textContent = opts.action.label || "";
      if (typeof opts.action.onClick === "function") {
        actionEl.addEventListener("click", opts.action.onClick);
      }
      content.appendChild(actionEl);
    }

    var closeEl = document.createElement("button");
    closeEl.type = "button";
    closeEl.className = CLOSE_CLASS;
    closeEl.setAttribute("data-slot", "toast-close");
    closeEl.setAttribute("aria-label", "Close toast");
    closeEl.innerHTML = ICONS.close;
    content.appendChild(closeEl);

    t.appendChild(content);
    return t;
  }

  function createToast(opts) {
    var vp = viewportOf(null);
    if (!vp) return null;
    var t = build(opts);
    t.setAttribute("data-starting-style", "");
    vp.appendChild(t);
    layout(vp);
    // Enter: flush the starting transform, then transition into place
    // (setTimeout instead of rAF so background tabs still settle).
    void t.offsetHeight;
    window.setTimeout(function () {
      t.removeAttribute("data-starting-style");
    }, 20);
    startTimer(t);
    return t;
  }

  function dismiss(t, direction) {
    if (!t || t.hasAttribute("data-ending-style")) return;
    stopTimer(t);
    var vp = viewportOf(t);
    t.setAttribute("data-ending-style", "");
    if (direction) t.setAttribute("data-swipe-direction", direction);
    window.setTimeout(function () {
      t.remove();
      if (vp) layout(vp);
    }, ENTER_EXIT_MS);
    if (vp) layout(vp);
  }

  // ----- expand on hover ----------------------------------------------------

  function setExpanded(vp, expanded) {
    if (vp.hasAttribute("data-expanded") === expanded) return;
    vp.toggleAttribute("data-expanded", expanded);
    toastsOf(vp).forEach(expanded ? stopTimer : startTimer);
    layout(vp);
  }

  document.addEventListener("pointerover", function (e) {
    if (!(e.target instanceof Element)) return;
    var vp = e.target.closest("[data-tui-toaster]");
    if (vp) setExpanded(vp, true);
  });

  document.addEventListener("pointerout", function (e) {
    if (!(e.target instanceof Element)) return;
    var vp = e.target.closest("[data-tui-toaster]");
    if (!vp) return;
    if (e.relatedTarget instanceof Element && e.relatedTarget.closest("[data-tui-toaster]") === vp) return;
    setExpanded(vp, false);
  });

  // ----- close button -------------------------------------------------------

  document.addEventListener("click", function (e) {
    if (!(e.target instanceof Element)) return;
    var close = e.target.closest('[data-slot="toast-close"]');
    if (close) dismiss(close.closest('[data-slot="toast"]'));
  });

  // ----- swipe to dismiss (down and right, the bottom-right defaults) -------

  document.addEventListener("pointerdown", function (e) {
    if (!(e.target instanceof Element)) return;
    var t = e.target.closest('[data-slot="toast"]');
    if (!t || e.target.closest("button")) return;
    t._tuiSwipe = { x: e.clientX, y: e.clientY };
  });

  document.addEventListener("pointermove", function (e) {
    if (!(e.target instanceof Element)) return;
    var t = e.target.closest('[data-slot="toast"]');
    if (!t || !t._tuiSwipe) return;
    var dx = Math.max(0, e.clientX - t._tuiSwipe.x);
    var dy = Math.max(0, e.clientY - t._tuiSwipe.y);
    t.style.setProperty("--toast-swipe-movement-x", dx + "px");
    t.style.setProperty("--toast-swipe-movement-y", dy + "px");
  });

  document.addEventListener("pointerup", function (e) {
    if (!(e.target instanceof Element)) return;
    var t = e.target.closest('[data-slot="toast"]');
    if (!t || !t._tuiSwipe) return;
    var dx = Math.max(0, e.clientX - t._tuiSwipe.x);
    var dy = Math.max(0, e.clientY - t._tuiSwipe.y);
    t._tuiSwipe = null;
    if (dy >= SWIPE_THRESHOLD && dy >= dx) {
      dismiss(t, "down");
    } else if (dx >= SWIPE_THRESHOLD) {
      dismiss(t, "right");
    } else {
      t.style.setProperty("--toast-swipe-movement-x", "0px");
      t.style.setProperty("--toast-swipe-movement-y", "0px");
    }
  });

  // ----- the toast manager pendant: add, close, promise ---------------------

  function normalize(opts) {
    opts = Object.assign({}, opts);
    if (opts.actionProps) {
      opts.action = {
        label: opts.actionProps.children,
        onClick: opts.actionProps.onClick,
      };
    }
    return opts;
  }

  var api = {
    add: function (opts) {
      var t = createToast(normalize(opts || {}));
      return t ? t.id : null;
    },
    close: function (id) {
      if (id === undefined) {
        document.querySelectorAll('[data-slot="toast"]').forEach(function (t) {
          dismiss(t);
        });
        return;
      }
      var el = typeof id === "string" ? document.getElementById(id) : id;
      if (el) dismiss(el);
    },
    // toast.promise: a loading toast that morphs with the promise.
    promise: function (promise, opts) {
      opts = opts || {};
      var t = createToast(Object.assign({}, normalize(opts), { type: "loading", title: opts.loading || "Loading..." }));
      if (!t) return null;
      var p = typeof promise === "function" ? promise() : promise;
      function morph(type, title) {
        if (!t.isConnected) return;
        t.setAttribute("data-type", type);
        var iconEl = t.querySelector('[data-slot="toast-icon"]');
        if (iconEl) {
          iconEl.hidden = false;
          iconEl.innerHTML = ICONS[type] || "";
        }
        var titleEl = t.querySelector('[data-slot="toast-title"]');
        if (titleEl) {
          titleEl.hidden = false;
          titleEl.textContent = title;
        }
        var vp = viewportOf(t);
        if (vp) layout(vp);
        t._tuiRemaining = null;
        startTimer(t);
      }
      Promise.resolve(p)
        .then(function (data) {
          morph("success", typeof opts.success === "function" ? opts.success(data) : opts.success || "Done");
        })
        .catch(function (err) {
          morph("error", typeof opts.error === "function" ? opts.error(err) : opts.error || "Error");
        });
      return t.id;
    },
  };

  window.tui = window.tui || {};
  window.tui.toast = api;

  // ----- SSR/htmx adoption --------------------------------------------------

  function init() {
    document.querySelectorAll("[data-tui-toast-ssr]").forEach(function (stub) {
      var opts = {
        id: stub.id || undefined,
        title: stub.getAttribute("data-tui-toast-title") || "",
        description: stub.getAttribute("data-tui-toast-description") || "",
        type: stub.getAttribute("data-type") || "",
        timeout: parseInt(stub.getAttribute("data-tui-toast-timeout"), 10) || 0,
      };
      stub.remove();
      createToast(opts);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
  // Re-init on any childList mutation, directly (never rAF-deferred: rAF
  // does not fire in hidden tabs or throttled iframes): swapped-in markup
  // wires itself.
  new MutationObserver(() => init()).observe(document.body, { childList: true, subtree: true });
})();

// components/toggle/toggle.js
(function () {
  function isOn(el) {
    return el.hasAttribute("data-pressed");
  }

  function setState(el, on) {
    el.toggleAttribute("data-pressed", on);
    el.setAttribute("aria-pressed", on ? "true" : "false");
  }

  function values(group) {
    return [...group.querySelectorAll('[data-tui-toggle][data-pressed]')]
      .map((toggle) => toggle.getAttribute("data-tui-toggle-value"))
      .filter(Boolean);
  }

  function nextValues(group, toggle, nextPressed) {
    const value = toggle.getAttribute("data-tui-toggle-value");
    if (!value) return values(group);
    if (!group.hasAttribute("data-multiple")) return nextPressed ? [value] : [];
    const next = new Set(values(group));
    if (nextPressed) next.add(value);
    else next.delete(value);
    return [...next];
  }

  function dispatchToggleChange(toggle, pressed) {
    return toggle.dispatchEvent(
      new CustomEvent("toggle-change", {
        bubbles: true,
        cancelable: true,
        detail: {
          pressed,
          value: toggle.getAttribute("data-tui-toggle-value"),
        },
      }),
    );
  }

  document.addEventListener("click", (e) => {
    const toggle = e.target.closest("[data-tui-toggle]");
    if (!toggle || toggle.disabled) return;

    const group = toggle.closest("[data-tui-toggle-group]");
    const nextPressed = !isOn(toggle);
    if (!dispatchToggleChange(toggle, nextPressed)) return;
    const groupValue = group ? nextValues(group, toggle, nextPressed) : null;
    if (group) {
      const accepted = group.dispatchEvent(
        new CustomEvent("toggle-group-value-change", {
          bubbles: true,
          cancelable: true,
          detail: { value: groupValue },
        }),
      );
      if (!accepted) return;
    }
    if (
      toggle.hasAttribute("data-tui-toggle-controlled") ||
      (group && group.hasAttribute("data-tui-toggle-group-controlled"))
    ) {
      return;
    }

    if (group && !group.hasAttribute("data-multiple")) {
      group
        .querySelectorAll("[data-tui-toggle]")
        .forEach((t) => setState(t, false));
      setState(toggle, nextPressed);
    } else {
      setState(toggle, nextPressed);
    }

    // Expose the group's active value(s) so CSS/HTMX can react without custom JS.
    if (group) {
      const on = values(group);
      group.setAttribute("data-tui-toggle-group-value", on.join(" "));
    }
  });
})();

// components/tooltip/tooltip.js
// Uses window.FloatingUIDOM from components/floatingui (loaded in the same bundle).
(function () {
  // Exit animations run at the tw-animate default (150ms); hide after.
  const EXIT_MS = 170;

  const escapeTargets = new WeakSet();
  function listenForEscape(element) {
    if (!element || escapeTargets.has(element)) return;
    element.addEventListener("keydown", closeOnEscapeKeyDown);
    escapeTargets.add(element);
  }

  // useDismiss: popup/reference listeners stop Escape before outer document handlers.
  function closeOnEscapeKeyDown(event) {
    if (event.key !== "Escape") return;
    const contents = event.currentTarget === document
      ? allContents()
      : [event.currentTarget.hasAttribute("data-tui-tooltip-content")
        ? event.currentTarget
        : contentFor(event.currentTarget)];
    let handled = false;
    for (const content of contents) {
      if (!content?.hasAttribute("data-open")) continue;
      if (requestOpenChange(triggerFor(content), false)) event.preventDefault();
      event.stopPropagation();
      handled = true;
    }
    return handled;
  }

  function allContents() {
    return document.querySelectorAll("[data-tui-tooltip-content]");
  }

  function contentFor(trigger) {
    return document.getElementById(trigger.getAttribute("aria-describedby"));
  }

  function triggerFor(content) {
    return document.querySelector(
      '[data-tui-tooltip-trigger][aria-describedby="' + content.id + '"]',
    );
  }

  // Base UI zooms the popup out of the anchor's center point (e.g.
  // "96px -4px"), not out of a placement corner.
  function anchorOrigin(result, anchorRect, positionerRect, sideOffset) {
    const side = result.placement.split("-")[0];
    const centerX = anchorRect.left + anchorRect.width / 2 - positionerRect.left + "px";
    const centerY = anchorRect.top + anchorRect.height / 2 - positionerRect.top + "px";
    if (side === "bottom") return centerX + " " + -sideOffset + "px";
    if (side === "top") return centerX + " calc(100% + " + sideOffset + "px)";
    if (side === "right") return -sideOffset + "px " + centerY;
    return "calc(100% + " + sideOffset + "px) " + centerY;
  }

  // The arrow styles itself per side (data-side classes, like Base UI's
  // Arrow); the script only feeds it the side and the centered coordinate.
  function placeArrow(content, side, arrowData) {
    const arrowEl = content.querySelector("[data-tui-tooltip-arrow]");
    if (!arrowEl) return;
    arrowEl.setAttribute("data-side", side);
    arrowEl.style.left = arrowData && arrowData.x != null ? arrowData.x + "px" : "";
    arrowEl.style.top = arrowData && arrowData.y != null ? arrowData.y + "px" : "";
  }

  // Moves the content to <body> (shadcn portals it the same way).
  // The unmount half of the React portal pendant: a portaled content lives
  // as long as its SSR declaration site (_tuiPortalOwner) stays in the
  // document. Trigger-presence heuristics judged mid-swap moments wrongly -
  // multi-phase swap layers briefly disconnect the new triggers.
  function removeOrphanedContents(content) {
    document.querySelectorAll("body > [data-tui-tooltip-content]").forEach((c) => {
      if (c !== content && c._tuiPortalOwner && !c._tuiPortalOwner.isConnected) {
        stopAutoPositioning(c);
        c.remove();
      }
    });
  }

  function portal(content) {
    listenForEscape(content);
    removeOrphanedContents(content);
    if (content.parentElement !== document.body) {
      if (!content._tuiPortalOwner) content._tuiPortalOwner = content.parentElement;
      document.body.appendChild(content);
    }
  }

  function positionContent(content, trigger) {
    const { computePosition, offset, flip, shift, arrow } = window.FloatingUIDOM;
    const side = content.getAttribute("data-tui-tooltip-side") || "top";
    const sideOffset =
      parseInt(content.getAttribute("data-tui-tooltip-side-offset"), 10) || 4;
    const arrowEl = content.querySelector("[data-tui-tooltip-arrow]");

    return computePosition(trigger, content, {
      placement: side,
      strategy: "absolute",
      middleware: [
        offset(sideOffset),
        flip(),
        shift({ padding: 5 }),
        arrowEl ? arrow({ element: arrowEl, padding: 5 }) : undefined,
      ].filter(Boolean),
    }).then((result) => {
      content.style.transition = "none";
      content.style.left = result.x + "px";
      content.style.top = result.y + "px";
      content.style.setProperty(
        "--transform-origin",
        anchorOrigin(
          result,
          trigger.getBoundingClientRect(),
          content.getBoundingClientRect(),
          sideOffset,
        ),
      );
      const finalSide = result.placement.split("-")[0];
      content.setAttribute("data-side", finalSide);
      placeArrow(content, finalSide, result.middlewareData.arrow);
      content.offsetHeight; // flush styles before re-enabling transitions
      content.style.transition = "";
    });
  }

  function startAutoPositioning(content, trigger) {
    if (content._tuiPositionCleanup) content._tuiPositionCleanup();
    let resolveFirst;
    const firstPosition = new Promise((resolve) => {
      resolveFirst = resolve;
    });
    const update = () => positionContent(content, trigger).then(resolveFirst, resolveFirst);
    content._tuiPositionCleanup = window.FloatingUIDOM.autoUpdate(trigger, content, update, {
      elementResize: typeof ResizeObserver !== "undefined",
      layoutShift: typeof IntersectionObserver !== "undefined",
    });
    return firstPosition;
  }

  function stopAutoPositioning(content) {
    if (!content._tuiPositionCleanup) return;
    content._tuiPositionCleanup();
    content._tuiPositionCleanup = null;
  }

  function open(trigger) {
    // Consumers can suppress a tooltip situationally (e.g. the sidebar only
    // shows menu tooltips while collapsed to icons).
    if (trigger.hasAttribute("data-tui-tooltip-disabled")) return;
    const content = contentFor(trigger);
    if (!content) return;
    clearTimeout(content._tuiHide);
    portal(content);
    // z-index portal like shadcn (no native top layer); re-append
    // keeps paint order = open order.
    document.body.appendChild(content);
    content.hidden = false;

    // Position it invisibly first, then play the enter animation in place.
    content.style.visibility = "hidden";
    startAutoPositioning(content, trigger).then(() => {
      if (content.hidden) return; // closed meanwhile
      // duration-100 transitions `all`; a visibility transition would
      // freeze at hidden in background tabs - flip suppressed.
      content.style.transitionProperty = "none";
      content.style.visibility = "";
      void content.offsetWidth;
      content.style.transitionProperty = "";
      content.removeAttribute("data-closed");
      content.removeAttribute("data-ending-style");
      content.setAttribute("data-open", "");
      content.setAttribute("data-starting-style", "");
      const arrowEl = content.querySelector("[data-tui-tooltip-arrow]");
      if (arrowEl) {
        arrowEl.removeAttribute("data-closed");
        arrowEl.removeAttribute("data-ending-style");
        arrowEl.setAttribute("data-open", "");
        arrowEl.setAttribute("data-starting-style", "");
      }
      trigger.setAttribute("data-popup-open", "");
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          content.removeAttribute("data-starting-style");
          if (arrowEl) arrowEl.removeAttribute("data-starting-style");
        });
      });
    });
  }

  function close(content) {
    if (content.hidden) return;
    stopAutoPositioning(content);
    content.removeAttribute("data-open");
    content.removeAttribute("data-starting-style");
    content.setAttribute("data-closed", "");
    content.setAttribute("data-ending-style", "");
    const arrowEl = content.querySelector("[data-tui-tooltip-arrow]");
    if (arrowEl) {
      arrowEl.removeAttribute("data-open");
      arrowEl.removeAttribute("data-starting-style");
      arrowEl.setAttribute("data-closed", "");
      arrowEl.setAttribute("data-ending-style", "");
    }
    const trigger = triggerFor(content);
    if (trigger) trigger.removeAttribute("data-popup-open");
    clearTimeout(content._tuiHide);
    content._tuiHide = setTimeout(() => {
      if (content.hasAttribute("data-closed") && !content.hidden) {
        content.hidden = true;
        content.removeAttribute("data-ending-style");
        if (arrowEl) arrowEl.removeAttribute("data-ending-style");
      }
    }, EXIT_MS);
  }

  function closeAll() {
    allContents().forEach(close);
  }

  function requestOpenChange(trigger, nextOpen) {
    if (!trigger) return false;
    const content = contentFor(trigger);
    if (!content || content.hasAttribute("data-open") === nextOpen) return false;
    const accepted = content.dispatchEvent(
      new CustomEvent("tooltip-open-change", {
        bubbles: true,
        cancelable: true,
        detail: { open: nextOpen },
      }),
    );
    if (!accepted || content.hasAttribute("data-tui-tooltip-controlled")) return false;
    if (nextOpen) open(trigger);
    else close(content);
    return true;
  }

  function requestCloseAll() {
    allContents().forEach((content) => requestOpenChange(triggerFor(content), false));
  }

  // ----- events -------------------------------------------------------------

  document.addEventListener("mouseover", (e) => {
    const trigger = e.target.closest("[data-tui-tooltip-trigger]");
    if (trigger) requestOpenChange(trigger, true);
  });

  document.addEventListener("mouseout", (e) => {
    const trigger = e.target.closest("[data-tui-tooltip-trigger]");
    if (!trigger) return;
    if (e.relatedTarget && trigger.contains(e.relatedTarget)) return; // still inside
    const content = contentFor(trigger);
    if (content) requestOpenChange(trigger, false);
  });

  // Keyboard: show on focus, hide on blur. Like Base UI, only visible
  // focus opens the tooltip, so programmatic focus (e.g. a dialog's
  // autofocus) does not pop it.
  document.addEventListener("focusin", (e) => {
    const trigger = e.target.closest("[data-tui-tooltip-trigger]");
    if (trigger && trigger.matches(":focus-visible")) requestOpenChange(trigger, true);
  });

  document.addEventListener("focusout", (e) => {
    const trigger = e.target.closest("[data-tui-tooltip-trigger]");
    if (!trigger) return;
    const content = contentFor(trigger);
    if (content) requestOpenChange(trigger, false);
  });

  document.addEventListener("keydown", closeOnEscapeKeyDown);

  // Content stays in its hidden portal node until it opens.
  function init() {
    removeOrphanedContents();
    document.querySelectorAll("[data-tui-tooltip-trigger]").forEach(listenForEscape);
    allContents().forEach((content) => {
      if (content.getAttribute("data-tui-tooltip-initial-open") === "true") {
        content.removeAttribute("data-tui-tooltip-initial-open");
        const trigger = triggerFor(content);
        if (trigger) open(trigger);
      }
    });
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
  // Re-init on any childList mutation, directly (never rAF-deferred: rAF
  // does not fire in hidden tabs or throttled iframes): swapped-in markup
  // wires itself, removals release portaled content through the
  // ownership sweep.
  new MutationObserver(() => init()).observe(document.body, { childList: true, subtree: true });

})();

