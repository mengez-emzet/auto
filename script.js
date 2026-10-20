/* AutoHub behaviour. Plain JavaScript, no dependencies. Shared by every page. */
(function () {
  "use strict";

  var root = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $all(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  /* Toast message */
  var toastEl = $("#toast");
  var toastTimer;
  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("show"); }, 2200);
  }

  /* Theme toggle */
  var themeBtn = $("#themeToggle");
  function syncThemeButton() {
    var isDark = root.getAttribute("data-theme") === "dark";
    themeBtn.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");
    themeBtn.setAttribute("aria-pressed", String(!isDark));
    var meta = $('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", isDark ? "#0a0a0a" : "#f6f6f6");
  }
  themeBtn.addEventListener("click", function () {
    var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    var apply = function () {
      root.setAttribute("data-theme", next);
      try { localStorage.setItem("autohubTheme", next); } catch (e) {}
      syncThemeButton();
    };
    if (document.startViewTransition && !reduceMotion) {
      var r = themeBtn.getBoundingClientRect();
      root.style.setProperty("--tx", (r.left + r.width / 2) + "px");
      root.style.setProperty("--ty", (r.top + r.height / 2) + "px");
      document.startViewTransition(apply);
    } else { apply(); }
    toast(next === "dark" ? "Dark mode on" : "Light mode on");
  });
  syncThemeButton();

  /* Mobile menu */
  var burger = $("#burger");
  var nav = $("#nav");
  function setMenu(open) {
    nav.classList.toggle("open", open);
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  }
  burger.addEventListener("click", function () { setMenu(!nav.classList.contains("open")); });

  /* Mark the current page in the navigation */
  var file = (window.location.pathname.split("/").pop() || "index.html").toLowerCase();
  $all(".navlink", nav).forEach(function (a) {
    var match = a.getAttribute("href").toLowerCase() === file;
    a.classList.toggle("active", match);
    if (match) a.setAttribute("aria-current", "page");
  });

  /* Page transition: the red cover slides over the page before navigating */
  var wipe = $("#wipe");
  document.addEventListener("click", function (e) {
    var a = e.target.closest ? e.target.closest("a[href]") : null;
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || a.target === "_blank") return;
    var href = a.getAttribute("href");
    if (!href || href.charAt(0) === "#" || /^[a-z]+:/i.test(href) || !/\.html(\?|#|$)/i.test(href)) return;
    var target = href.split(/[?#]/)[0].toLowerCase();
    if (target === file || reduceMotion || !wipe) return;
    e.preventDefault();
    setMenu(false);
    wipe.classList.add("in");
    setTimeout(function () { window.location.href = href; }, 480);
  });
  window.addEventListener("pageshow", function (e) { if (e.persisted && wipe) wipe.classList.remove("in"); });

  /* Scroll progress, header shadow, back to top */
  var progress = $("#progress");
  var header = $("#header");
  var toTop = $("#toTop");
  var ticking = false;
  var pageHero = $(".pagehero");
  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.transform = "scaleX(" + (max > 0 ? y / max : 0) + ")";
    header.classList.toggle("scrolled", y > 10);
    toTop.classList.toggle("show", y > 600);
    if (!reduceMotion) {
      root.style.setProperty("--spin", (y * 0.35).toFixed(1) + "deg");
      if (pageHero) pageHero.style.setProperty("--sy", Math.min(y, 700));
    }
    ticking = false;
  }
  window.addEventListener("scroll", function () {
    if (!ticking) { ticking = true; window.requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();
  toTop.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" }); });

  /* Reveal on scroll */
  var reveals = $all(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var el = entry.target;
          var siblings = el.parentElement ? $all(".reveal", el.parentElement) : [];
          var idx = Math.max(0, siblings.indexOf(el));
          el.style.transitionDelay = Math.min(idx, 5) * 70 + "ms";
          el.classList.add("in");
          io.unobserve(el);
          /* clear the stagger delay so hover effects respond instantly */
          setTimeout(function () { el.style.transitionDelay = ""; }, 1300);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("in"); });
  }

  /* Animated counters */
  function runCounter(el) {
    var target = parseInt(el.getAttribute("data-count"), 10) || 0;
    if (reduceMotion) { el.textContent = target; return; }
    var start = null;
    function step(ts) {
      if (start === null) start = ts;
      var p = Math.min((ts - start) / 1400, 1);
      el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) window.requestAnimationFrame(step);
    }
    window.requestAnimationFrame(step);
  }
  var counters = $all("[data-count]");
  if ("IntersectionObserver" in window) {
    var co = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { runCounter(entry.target); co.unobserve(entry.target); }
      });
    }, { threshold: 0.6 });
    counters.forEach(function (c) { co.observe(c); });
  } else {
    counters.forEach(runCounter);
  }

  /* Cursor ring, 3D tilt, magnetic buttons and click ripple (mouse devices) */
  if (finePointer && !reduceMotion) {
    var cur = $("#cursor");
    var cx = 0, cy = 0, tx = 0, ty = 0, started = false;
    var hotSel = "a, button, input, select, textarea, label, summary, .card, .pcard, .pimg";
    document.addEventListener("mousemove", function (e) {
      tx = e.clientX; ty = e.clientY;
      if (!started) { cx = tx; cy = ty; started = true; }
      cur.classList.add("show");
    });
    document.addEventListener("mouseleave", function () { cur.classList.remove("show"); });
    document.addEventListener("mouseover", function (e) { cur.classList.toggle("hot", !!(e.target.closest && e.target.closest(hotSel))); });
    document.addEventListener("mousedown", function () { cur.classList.add("down"); });
    document.addEventListener("mouseup", function () { cur.classList.remove("down"); });
    (function loop() {
      cx += (tx - cx) * 0.22; cy += (ty - cy) * 0.22;
      cur.style.transform = "translate3d(" + cx + "px," + cy + "px,0) translate(-50%,-50%)";
      window.requestAnimationFrame(loop);
    })();

    $all(".card, .pack, .stat, .steps li").forEach(function (el) {
      el.classList.add("tilt");
      el.addEventListener("mouseenter", function () { el.classList.add("tilting"); });
      el.addEventListener("mousemove", function (e) {
        var r = el.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        el.style.setProperty("--rx", (-py * 9).toFixed(2) + "deg");
        el.style.setProperty("--ry", (px * 11).toFixed(2) + "deg");
      });
      el.addEventListener("mouseleave", function () {
        el.classList.remove("tilting");
        el.style.removeProperty("--rx");
        el.style.removeProperty("--ry");
      });
    });

    $all(".btn, .iconbtn").forEach(function (el) {
      el.classList.add("magnet");
      el.addEventListener("mousemove", function (e) {
        var r = el.getBoundingClientRect();
        el.style.setProperty("--mx", ((e.clientX - r.left - r.width / 2) * 0.22).toFixed(1) + "px");
        el.style.setProperty("--my", ((e.clientY - r.top - r.height / 2) * 0.3).toFixed(1) + "px");
      });
      el.addEventListener("mouseleave", function () {
        el.style.removeProperty("--mx");
        el.style.removeProperty("--my");
      });
    });
  }
  $all(".btn").forEach(function (btn) {
    btn.addEventListener("pointerdown", function (e) {
      if (reduceMotion) return;
      var r = btn.getBoundingClientRect();
      var size = Math.max(r.width, r.height) * 2;
      var dot = document.createElement("span");
      dot.className = "ripple";
      dot.style.width = dot.style.height = size + "px";
      dot.style.left = (e.clientX - r.left - size / 2) + "px";
      dot.style.top = (e.clientY - r.top - size / 2) + "px";
      btn.appendChild(dot);
      setTimeout(function () { dot.remove(); }, 700);
    });
  });

  /* Home page: photo slideshow, mouse parallax and typed words */
  var hero = $(".hero");
  if (hero) {
    var slides = $all(".slide", hero);
    var dots = $all(".hdot", hero);
    var current = 0, slideTimer;
    var showSlide = function (i) {
      current = (i + slides.length) % slides.length;
      slides.forEach(function (s, n) { s.classList.toggle("on", n === current); });
      dots.forEach(function (d, n) { d.classList.toggle("on", n === current); });
    };
    var restart = function () {
      clearInterval(slideTimer);
      if (slides.length > 1) slideTimer = setInterval(function () { showSlide(current + 1); }, 5000);
    };
    dots.forEach(function (d, n) { d.addEventListener("click", function () { showSlide(n); restart(); }); });
    restart();

    if (finePointer && !reduceMotion) {
      var pending = false, mx = 0, my = 0;
      hero.addEventListener("mousemove", function (e) {
        var r = hero.getBoundingClientRect();
        mx = ((e.clientX - r.left) / r.width - 0.5) * 2;
        my = ((e.clientY - r.top) / r.height - 0.5) * 2;
        if (!pending) {
          pending = true;
          window.requestAnimationFrame(function () {
            hero.style.setProperty("--px", mx.toFixed(3));
            hero.style.setProperty("--py", my.toFixed(3));
            pending = false;
          });
        }
      });
      hero.addEventListener("mouseleave", function () { hero.style.setProperty("--px", 0); hero.style.setProperty("--py", 0); });
    }

    var typed = $("#typed");
    if (typed) {
      var words = ["body kits", "paint and respray", "car wraps", "mag wheels", "detailing", "interior refresh"];
      var w = 0, ch = 0, del = false;
      {
        (function tick() {
          var word = words[w];
          ch += del ? -1 : 1;
          typed.textContent = word.slice(0, ch);
          var wait = del ? 35 : 75;
          if (!del && ch === word.length) { del = true; wait = 1500; }
          else if (del && ch === 0) { del = false; w = (w + 1) % words.length; wait = 350; }
          setTimeout(tick, wait);
        })();
      }
    }
  }

  /* Services: filters and details panel */
  var chips = $all(".chip");
  var cards = $all("#cards .card");
  chips.forEach(function (chip) {
    chip.addEventListener("click", function () {
      var f = chip.getAttribute("data-filter");
      chips.forEach(function (c) { c.classList.toggle("active", c === chip); });
      cards.forEach(function (card) {
        var show = f === "all" || card.getAttribute("data-cat") === f;
        card.classList.toggle("hide", !show);
        if (show) { card.classList.add("in"); }
      });
    });
  });

  var details = {
    "Car Body Kits and Pimping": ["Exterior styling and personalization", "A distinctive, upgraded look for your vehicle", "Kits in PP, ABS, FRP or carbon fiber, see the Body Kits page"],
    "Detailing": ["Vehicle cleaning and finish focused care", "Refreshes exterior and interior surfaces", "Brings back the look of your vehicle"],
    "Panel Beating and Respray": ["Bodywork repair", "Repainting to restore vehicle panels", "Improves the overall finish"],
    "Car Wrapping": ["Wrap options to change your car's appearance", "A way to personalize the look of your vehicle", "Ask us about the options available"],
    "Interior Rejuvenation": ["Refresh for cabin surfaces and trim", "Improves the look and feel of the interior", "Careful attention to the finish"],
    "Mag Wheels": ["Wheel styling options", "Complements your vehicle's overall appearance", "Helps shape the stance of the car"]
  };
  if (cards.length) {
    var modal = document.createElement("div");
    modal.className = "modal";
    modal.innerHTML = '<div class="modalbg" data-close="1"></div>' +
      '<div class="modalbox" role="dialog" aria-modal="true" aria-labelledby="modalTitle">' +
      '<button type="button" class="modalclose" data-close="1" aria-label="Close details">&times;</button>' +
      '<h3 id="modalTitle"></h3><p class="modallead" id="modalLead"></p><ul id="modalList"></ul>' +
      '<p class="small">Scope, materials, timelines and pricing are confirmed during consultation.</p>' +
      '<div class="modalbtns"><a class="btn btnred" id="modalGo" href="contact.html">Request this service</a>' +
      '<a class="btn btnghost" id="modalShop" href="products.html?group=care" hidden>Shop car care products</a>' +
      '<button type="button" class="btn btnghost" data-close="1">Close</button></div></div>';
    document.body.appendChild(modal);
    var lastFocus = null;
    var closeModal = function () {
      modal.classList.remove("open");
      document.body.classList.remove("locked");
      if (lastFocus) lastFocus.focus();
    };
    var openModal = function (card) {
      var title = $("h3", card).textContent.trim();
      $("#modalTitle").textContent = title;
      $("#modalLead").textContent = $("p", card).textContent.trim();
      $("#modalList").innerHTML = (details[title] || []).map(function (t) { return "<li>" + t + "</li>"; }).join("");
      $("#modalGo").setAttribute("href", "contact.html?service=" + encodeURIComponent(title));
      $("#modalShop").hidden = !(title === "Detailing" || title === "Interior Rejuvenation");
      lastFocus = document.activeElement;
      modal.classList.add("open");
      document.body.classList.add("locked");
      setTimeout(function () { $(".modalclose", modal).focus(); }, 60);
    };
    cards.forEach(function (card) {
      var more = document.createElement("span");
      more.className = "cardmore";
      more.textContent = "View details";
      card.appendChild(more);
      card.setAttribute("tabindex", "0");
      card.setAttribute("role", "button");
      card.addEventListener("click", function () { openModal(card); });
      card.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openModal(card); }
      });
    });
    modal.addEventListener("click", function (e) { if (e.target.getAttribute && e.target.getAttribute("data-close")) closeModal(); });
    modal.addEventListener("keydown", function (e) {
      if (e.key !== "Tab") return;
      var f = $all("button, a[href]", modal);
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && modal.classList.contains("open")) closeModal(); });
  }
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") setMenu(false); });

  /* Body kits: material picker */
  var matPanel = $("#matPanel");
  if (matPanel) {
    var materials = {
      pp: { name: "PP (Polypropylene)", text: "Flexible, with strong impact resistance and easy to paint.", alt: "PP polypropylene pellets", flex: 90, rigid: 55, light: 75 },
      abs: { name: "ABS (Acrylonitrile Butadiene Styrene)", text: "High rigidity, a smooth surface and excellent toughness.", alt: "ABS pellets", flex: 60, rigid: 90, light: 70 },
      frp: { name: "FRP (Fiberglass)", text: "Lightweight and strong, and suitable for customized parts.", alt: "Fiberglass strands", flex: 40, rigid: 80, light: 80 },
      carbon: { name: "Carbon Fiber", text: "Lightweight with high strength and a premium appearance.", alt: "Carbon fiber weave", flex: 30, rigid: 95, light: 98 }
    };
    var tabs = $all(".tab");
    var showMaterial = function (key) {
      var m = materials[key];
      if (!m) return;
      $("#matName").textContent = m.name;
      $("#matText").textContent = m.text;
      var img = $("#matImg");
      img.src = "images/mat-" + key + ".jpg";
      img.alt = m.alt;
      $("#mFlex").style.width = m.flex + "%";
      $("#mRigid").style.width = m.rigid + "%";
      $("#mLight").style.width = m.light + "%";
      matPanel.classList.remove("swap");
      void matPanel.offsetWidth;
      matPanel.classList.add("swap");
    };
    tabs.forEach(function (t) {
      t.addEventListener("click", function () {
        tabs.forEach(function (o) {
          var on = o === t;
          o.classList.toggle("active", on);
          o.setAttribute("aria-selected", String(on));
        });
        showMaterial(t.getAttribute("data-mat"));
      });
    });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries, obs) {
        entries.forEach(function (e) { if (e.isIntersecting) { showMaterial("pp"); obs.disconnect(); } });
      }, { threshold: 0.3 }).observe(matPanel);
    } else { showMaterial("pp"); }
  }

  /* Body kits: before and after slider */
  var cmp = $("#cmpRange");
  if (cmp) {
    var wrap = cmp.parentElement;
    var setPos = function () { wrap.style.setProperty("--pos", cmp.value + "%"); };
    cmp.addEventListener("input", setPos);
    setPos();
    if (!reduceMotion && "IntersectionObserver" in window) {
      new IntersectionObserver(function (entries, obs) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          obs.disconnect();
          var t0 = null;
          (function demo(ts) {
            if (t0 === null) t0 = ts;
            var p = (ts - t0) / 1600;
            if (p >= 1 || document.activeElement === cmp) { cmp.value = 50; setPos(); return; }
            cmp.value = 50 + Math.sin(p * Math.PI * 2) * 38;
            setPos();
            window.requestAnimationFrame(demo);
          })(performance.now());
        });
      }, { threshold: 0.6 }).observe(wrap);
    }
  }

  /* Body kits: panel gap demo */
  var range = $("#gapRange");
  if (range) {
    var stage = $("#fitStage");
    var gapValue = $("#gapValue");
    var verdict = $("#fitVerdict");
    var updateGap = function () {
      var v = parseInt(range.value, 10);
      stage.style.setProperty("--gap", v);
      gapValue.textContent = v + " mm";
      var bad = v > 4;
      stage.setAttribute("data-state", bad ? "bad" : "good");
      verdict.innerHTML = bad
        ? "<b>Poor fitment:</b> a large gap, easy to shake and it affects appearance."
        : "<b>Precise mold:</b> perfect fitment and seamless integration.";
    };
    range.addEventListener("input", updateGap);
    updateGap();
  }

  /* Shipping: mode picker */
  var route = $(".route");
  if (route) {
    var rtabs = $all(".rtab");
    var vehicle = $("#vehicle");
    var routeText = $("#routeText");
    var icons = {
      sea: '<svg viewBox="0 0 56 56" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M6 36h44l-6 10H12z"/><path d="M14 36V24h24v12M22 24v-8h10v8"/></svg>',
      air: '<svg viewBox="0 0 56 56" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M4 30l16-3 14-16h6l-8 17 12 2 4-4h4l-3 7 3 7h-4l-4-4-12 2 8 17h-6L20 33 4 30z"/></svg>',
      express: '<svg viewBox="0 0 56 56" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M4 16h30v22H4zM34 24h10l8 8v6H34z"/><circle cx="14" cy="42" r="5"/><circle cx="42" cy="42" r="5"/></svg>'
    };
    var modes = {
      sea: { dur: "5s", text: "Sea freight suits larger kits and bulk orders. Timelines and costs are confirmed when you enquire." },
      air: { dur: "2.4s", text: "Air freight is a quicker option for parts you need sooner. Timelines and costs are confirmed when you enquire." },
      express: { dur: "3.4s", text: "Express delivery moves smaller parcels door to door. Timelines and costs are confirmed when you enquire." }
    };
    var setMode = function (key) {
      var m = modes[key];
      vehicle.innerHTML = icons[key];
      routeText.textContent = m.text;
      route.style.setProperty("--dur", m.dur);
      route.classList.remove("go");
      void route.offsetWidth;
      route.classList.add("go");
    };
    rtabs.forEach(function (t) {
      t.addEventListener("click", function () {
        rtabs.forEach(function (o) {
          var on = o === t;
          o.classList.toggle("active", on);
          o.setAttribute("aria-selected", String(on));
        });
        setMode(t.getAttribute("data-mode"));
      });
    });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries, obs) {
        entries.forEach(function (e) { if (e.isIntersecting) { setMode("sea"); obs.disconnect(); } });
      }, { threshold: 0.4 }).observe(route);
    } else { setMode("sea"); }
  }

  /* Contact: copy numbers, service chips, live message preview, WhatsApp send */
  $all(".contactlist a[href^='tel:']").forEach(function (a) {
    var val = document.createElement("div");
    val.className = "val";
    a.parentNode.insertBefore(val, a);
    val.appendChild(a);
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "copybtn";
    btn.textContent = "Copy";
    btn.setAttribute("aria-label", "Copy " + a.textContent);
    btn.addEventListener("click", function () {
      var number = a.textContent.trim();
      var done = function () { toast("Copied " + number); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(number).then(done, done);
      else done();
    });
    val.appendChild(btn);
  });

  var form = $("#quoteForm");
  if (form) {
    var formError = $("#formError");
    var previewText = $("#previewText");
    var picks = $all("input[name='service']", form);
    var buildMessage = function () {
      var name = form.elements.name.value.trim();
      var vehicleName = form.elements.vehicle.value.trim();
      var message = form.elements.message.value.trim();
      var services = picks.filter(function (p) { return p.checked; }).map(function (p) { return p.value; });
      return {
        ok: !!(name && vehicleName && message),
        text: "Hello AutoHub, my name is " + (name || "...") + ".\n" +
          "Vehicle: " + (vehicleName || "...") + "\n" +
          "Services: " + (services.length ? services.join(", ") : "General enquiry") + "\n" +
          "Request: " + (message || "...")
      };
    };
    var refresh = function () { previewText.textContent = buildMessage().text; };
    form.addEventListener("input", refresh);
    form.addEventListener("change", refresh);

    var wanted = new URLSearchParams(window.location.search).get("service");
    if (wanted) {
      picks.forEach(function (p) { if (p.value === wanted) p.checked = true; });
      toast("Selected: " + wanted);
    }
    refresh();

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var m = buildMessage();
      if (!m.ok) { formError.hidden = false; return; }
      formError.hidden = true;
      window.open("https://wa.me/263773963182?text=" + encodeURIComponent(m.text), "_blank", "noopener");
      toast("Opening WhatsApp");
    });
  }

  /* Letter by letter page titles */
  $all(".pagehero h1").forEach(function (h1) {
    var text = h1.textContent;
    h1.setAttribute("aria-label", text);
    h1.textContent = "";
    text.split("").forEach(function (chr, i) {
      var s = document.createElement("span");
      s.setAttribute("aria-hidden", "true");
      s.className = chr === " " ? "chsp" : "ch";
      s.style.setProperty("--i", i);
      s.textContent = chr === " " ? "\u00a0" : chr;
      h1.appendChild(s);
    });
  });

  /* Reveal from the sides */
  $all(".split > .reveal:first-child, .contactgrid > .reveal:first-child, .fitleft > .reveal").forEach(function (el) { el.classList.add("from-left"); });
  $all(".split > .reveal:last-child, .contactgrid > .reveal:last-child, .checks.reveal").forEach(function (el) { el.classList.add("from-right"); });

  /* Home page: find your service */
  var opts = $all(".opt");
  var result = $("#finderResult");
  opts.forEach(function (o) {
    o.addEventListener("click", function () {
      opts.forEach(function (x) { x.classList.toggle("on", x === o); });
      var svc = o.getAttribute("data-svc");
      result.innerHTML = '<h3></h3><p></p><a class="btn btnred" href="contact.html">Request this service</a>';
      $("h3", result).textContent = svc;
      $("p", result).textContent = o.getAttribute("data-why");
      $("a", result).setAttribute("href", "contact.html?service=" + encodeURIComponent(svc));
      result.classList.remove("pop");
      void result.offsetWidth;
      result.classList.add("pop");
    });
  });

  /* Footer year */
  var year = $("#year");
  if (year) year.textContent = new Date().getFullYear();
})();
