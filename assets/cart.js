/* Digital Dollar Store — shopping cart.
   Adds an "Add to Cart" button beside every product's existing Buy
   button (Buy stays as buy-now), a cart bar with count + subtotal, and
   a slide-over cart panel. Checkout posts item ids ONLY to the shared
   checkout endpoint, which prices everything server-side. Digital
   goods: no shipping, one copy of each item. */
(function () {
  'use strict';

  var CHECKOUT_URL = 'https://human-hands-ai-inbox-joshuajdawg0350-1282.vercel.app/api/checkout';
  var STORE = 'dds';
  var LS_KEY = 'dds-cart-v1';

  // id = the product's existing payment-link slug (matches the
  // server-side price map in the checkout endpoint).
  var PRODUCTS = {
    'fZuaEXgcNeaE7O5elv3kt1y': { name: 'Create with J-Dawg', cents: 100 },
    '7sYbJ11hTc2w2tLcdn3kt1z': { name: "Scotty's Job Site Calculator", cents: 99 },
    '14A28r6CdaYsd8p6T33kt1x': { name: 'Draw Pad', cents: 100 },
    '3cI6oH9Op3w0gkBcdn3kt1A': { name: 'Hustle City Drag Racing', cents: 199 },
    '6oU9AT1hTc2wgkB91b3kt1w': { name: 'Hustle City Craps', cents: 100 },
    'aFabJ17Gh3w0gkBb9j3kt1B': { name: 'Hustle City Solitaire', cents: 100 },
    'bJe7sL0dP4A44BTfpz3kt1g': { name: 'Hustle City', cents: 100 },
    '7sYfZh2lXfeIecta5f3kt1h': { name: 'Hustle City 2', cents: 100 },
    'aFadR98Kl6Icb0h6T33kt1v': { name: 'Hustle City Bundle', cents: 100 },
    'argiwm': { name: 'J-Dawgs Droppin Beats Studio', cents: 100 },
    '28E28r0dP3w08S9a5f3kt1j': { name: 'J-Dawgs Auto Tune Data', cents: 100 },
    '4gM28r6Cd3w0gkB2CN3kt1k': { name: 'Credential Compass', cents: 100 },
    'bJe9AT7Gh1nS9WdgtD3kt1l': { name: 'J-Dawgs Plain Talk', cents: 100 },
    '00w8wP8Kl2rWfgx2CN3kt1m': { name: 'J-Dawgs Caption & Hook Studio', cents: 100 },
    '4gM28r2lXaYsd8pcdn3kt1n': { name: 'J-Dawgs Seller Photo Studio', cents: 100 },
    '14A5kD7GhfeIfgx1yJ3kt1o': { name: 'J-Dawgs Pocket Player', cents: 100 },
    '7sY14n5y95E89Wd2CN3kt1p': { name: 'J-Dawgs Audio Fixer', cents: 100 },
    'eVq00j3q17Mg4BTdhr3kt1q': { name: 'J-Dawgs Ringtone & Alert Maker', cents: 100 },
    'eVq14ngcN7MgfgxgtD3kt1r': { name: 'J-Dawgs Speaker Rescue', cents: 100 },
    '8x27sLbWx4A46K10uF3kt1s': { name: 'J-Dawgs Moving Box & Belongings Finder', cents: 100 },
    '8x2cN56CdaYs8S9cdn3kt1t': { name: 'Watch Faces Pack 1', cents: 100 },
    'eVq00j3q15E8b0h4KV3kt1u': { name: 'Top 25 Templates Pack', cents: 100 },
    'fZu14n1hT7Mgb0h91b3kt1i': { name: 'Classic Games Pack', cents: 100 },
    'cNi9AT8Kl0jO2tL5OZ3kt0N': { name: 'J-Dawgs Prompt Generator', cents: 299 }
  };

  function money(cents) { return '$' + (cents / 100).toFixed(2); }

  function loadCart() {
    try {
      var raw = JSON.parse(localStorage.getItem(LS_KEY) || '[]');
      if (!Array.isArray(raw)) return [];
      return raw.filter(function (id) { return PRODUCTS[id]; });
    } catch (e) { return []; }
  }
  function saveCart() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(cart)); } catch (e) {}
  }

  var cart = loadCart();
  var bar, barLabel, barTotal, panel, scrim, itemsEl, totalEl, msgEl, checkoutBtn;

  function totalCents() {
    return cart.reduce(function (sum, id) { return sum + PRODUCTS[id].cents; }, 0);
  }

  function render() {
    var n = cart.length;
    barLabel.textContent = 'Cart · ' + n + (n === 1 ? ' item' : ' items');
    barTotal.textContent = money(totalCents());
    bar.classList.toggle('empty', n === 0);
    itemsEl.innerHTML = '';
    if (!n) {
      var empty = document.createElement('p');
      empty.className = 'dds-cart-empty';
      empty.textContent = 'Your cart is empty. Add anything you like as you browse — check out once when you are done.';
      itemsEl.appendChild(empty);
    }
    cart.forEach(function (id) {
      var line = document.createElement('div');
      line.className = 'dds-cart-line';
      var name = document.createElement('span');
      name.className = 'dds-line-name';
      name.textContent = PRODUCTS[id].name;
      var price = document.createElement('span');
      price.className = 'dds-line-price';
      price.textContent = money(PRODUCTS[id].cents);
      var rm = document.createElement('button');
      rm.className = 'dds-line-remove';
      rm.type = 'button';
      rm.textContent = 'Remove';
      rm.setAttribute('aria-label', 'Remove ' + PRODUCTS[id].name + ' from cart');
      rm.addEventListener('click', function () { removeFromCart(id); });
      line.appendChild(name); line.appendChild(price); line.appendChild(rm);
      itemsEl.appendChild(line);
    });
    totalEl.textContent = money(totalCents());
    document.querySelectorAll('.dds-add-cart').forEach(function (btn) {
      var inCart = cart.indexOf(btn.getAttribute('data-dds-id')) !== -1;
      btn.classList.toggle('in-cart', inCart);
      btn.textContent = inCart ? 'In Cart — View' : 'Add to Cart';
    });
  }

  function addToCart(id) {
    if (cart.indexOf(id) === -1) { cart.push(id); saveCart(); render(); }
    openPanel();
  }
  function removeFromCart(id) {
    cart = cart.filter(function (x) { return x !== id; });
    saveCart(); render();
  }

  function openPanel() { panel.classList.add('open'); scrim.classList.add('open'); }
  function closePanel() { panel.classList.remove('open'); scrim.classList.remove('open'); }

  function showMsg(text) { msgEl.textContent = text; msgEl.style.display = text ? 'block' : 'none'; }

  function checkout() {
    if (!cart.length) return;
    checkoutBtn.disabled = true;
    checkoutBtn.textContent = 'Taking you to checkout…';
    showMsg('');
    fetch(CHECKOUT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ store: STORE, items: cart.slice() })
    }).then(function (res) {
      return res.json().then(function (data) { return { ok: res.ok, status: res.status, data: data }; });
    }).then(function (r) {
      if (r.ok && r.data && r.data.url) { window.location.href = r.data.url; return; }
      throw new Error((r.data && r.data.error) || 'checkout_failed');
    }).catch(function () {
      checkoutBtn.disabled = false;
      checkoutBtn.textContent = 'Checkout with Card';
      showMsg('Cart checkout is being switched on — for now, the blue Buy button on each item checks out one at a time. Your cart is saved here.');
    });
  }

  function slugOf(a) {
    var href = a.getAttribute('href') || '';
    var m = href.match(/buy\.stripe\.com\/([A-Za-z0-9]+)/) || href.match(/jdawgs\.gumroad\.com\/l\/([A-Za-z0-9]+)/);
    return m ? m[1] : null;
  }

  function init() {
    // Add-to-cart buttons beside every known product's Buy button.
    document.querySelectorAll('a[href*="buy.stripe.com/"], a[href*="jdawgs.gumroad.com/l/"]').forEach(function (a) {
      var id = slugOf(a);
      if (!id || !PRODUCTS[id]) return;
      if (a.parentElement && a.parentElement.querySelector('.dds-add-cart[data-dds-id="' + id + '"]')) return;
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'dds-add-cart';
      btn.setAttribute('data-dds-id', id);
      btn.setAttribute('aria-label', 'Add ' + PRODUCTS[id].name + ' to cart');
      btn.textContent = 'Add to Cart';
      btn.addEventListener('click', function () { addToCart(id); });
      a.insertAdjacentElement('afterend', btn);
    });

    // Cart bar.
    bar = document.createElement('div');
    bar.id = 'dds-cart-bar';
    bar.innerHTML = '<span class="dds-bar-label"></span><span class="dds-bar-total"></span>';
    var viewBtn = document.createElement('button');
    viewBtn.type = 'button';
    viewBtn.textContent = 'View Cart';
    viewBtn.addEventListener('click', openPanel);
    bar.appendChild(viewBtn);
    barLabel = bar.querySelector('.dds-bar-label');
    barTotal = bar.querySelector('.dds-bar-total');
    document.body.appendChild(bar);

    // Scrim + panel.
    scrim = document.createElement('div');
    scrim.id = 'dds-cart-scrim';
    scrim.addEventListener('click', closePanel);
    document.body.appendChild(scrim);

    panel = document.createElement('aside');
    panel.id = 'dds-cart-panel';
    panel.setAttribute('aria-label', 'Shopping cart');
    panel.innerHTML =
      '<div class="dds-cart-head"><h2>Your Cart</h2><button id="dds-cart-close" type="button" aria-label="Close cart">✕</button></div>' +
      '<div id="dds-cart-items"></div>' +
      '<div id="dds-cart-foot">' +
      '<div class="dds-cart-totalrow"><span class="t">Total</span><span class="v" id="dds-cart-total"></span></div>' +
      '<p class="dds-cart-note">Digital downloads — no shipping, ever. Stripe collects your email at checkout and your backup copies arrive there after you pay.</p>' +
      '<button id="dds-checkout-btn" type="button">Checkout with Card</button>' +
      '<p id="dds-cart-msg" role="status"></p>' +
      '</div>';
    document.body.appendChild(panel);
    itemsEl = panel.querySelector('#dds-cart-items');
    totalEl = panel.querySelector('#dds-cart-total');
    msgEl = panel.querySelector('#dds-cart-msg');
    checkoutBtn = panel.querySelector('#dds-checkout-btn');
    panel.querySelector('#dds-cart-close').addEventListener('click', closePanel);
    checkoutBtn.addEventListener('click', checkout);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closePanel(); });

    render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
