const byId = id => document.getElementById(id);
const date = byId('date');
const train = byId('train');
const selected = new Set();
const storageKey = 'railberth-reservations-v1';
const today = new Date();
today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
date.min = date.value = today.toISOString().slice(0, 10);
const read = () => JSON.parse(localStorage.getItem(storageKey) ?? '[]');
const current = () => read().filter(row => row.date === date.value && row.train === train.value);

function render() {
  const taken = new Set(current().flatMap(row => row.seats));
  byId('seats').replaceChildren();
  for (let row = 1; row <= 6; row++) {
    for (const column of 'ABCD') {
      const seat = row + column;
      const button = document.createElement('button');
      button.textContent = seat;
      button.disabled = taken.has(seat);
      button.setAttribute('aria-pressed', selected.has(seat));
      button.onclick = () => {
        if (selected.has(seat)) selected.delete(seat);
        else selected.add(seat);
        render();
        byId('seats').children[(row - 1) * 4 + 'ABCD'.indexOf(column)].focus();
      };
      byId('seats').append(button);
    }
  }
  byId('history').replaceChildren(...read().reverse().map(row => {
    const item = document.createElement('li');
    item.textContent = [row.id, row.passenger, row.train, row.date, row.seats.join(', ')].join(' · ');
    return item;
  }));
}

byId('journey').onsubmit = event => event.preventDefault();
byId('journey').onchange = () => {
  selected.clear();
  byId('status').textContent = '';
  render();
};
window.addEventListener('storage', event => {
  if (event.key === storageKey) render();
});
byId('booking').onsubmit = async event => {
  event.preventDefault();
  const passenger = byId('passenger').value.trim();
  if (!date.reportValidity() || !passenger || !selected.size) {
    byId('status').textContent = 'Enter a name, choose a valid departure date, and select seats.';
    return;
  }
  const reservation = {id: crypto.randomUUID().slice(0, 8), passenger, train: train.value, date: date.value, seats: [...selected]};
  const save = () => {
    const rows = read();
    const conflict = rows.some(row => row.date === reservation.date && row.train === reservation.train && row.seats.some(seat => reservation.seats.includes(seat)));
    if (conflict) return 'A selected seat is already reserved. Select seats again.';
    rows.push(reservation);
    localStorage.setItem(storageKey, JSON.stringify(rows));
    return 'Reserved. Booking reference ' + reservation.id;
  };
  try {
    byId('status').textContent = navigator.locks ? await navigator.locks.request(storageKey, save) : save();
    selected.clear();
    render();
  } catch {
    byId('status').textContent = 'Could not save the reservation on this device.';
  }
};
render();
