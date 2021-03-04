import React, { useState, useEffect, useRef, useCallback } from 'react';
import Deck from './Deck/Deck';
import './App.css';

let deck_a = [
  { id: 1, name: 'A' },
  { id: 2, name: 'B' },
  { id: 3, name: 'C' },
  { id: 4, name: 'D' },
  { id: 5, name: 'E' },
];
let deck_b = [
  { id: 6, name: 'F' },
  { id: 7, name: 'G' },
  { id: 8, name: 'H' },
  { id: 9, name: 'I' },
  { id: 10, name: 'J' },
];

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min) + min);
}

function getCardsWithRandomHeight(items) {
  return items.map(o => ({ ...o, height: getRandomInt(50, 250) }));
}


function App() {
  const [items, setItems] = useState(() => getCardsWithRandomHeight(deck_a));
  const deckRef = useRef(null);

  function addItems() {
    setItems(prevItems => [...prevItems, ...getCardsWithRandomHeight(deck_b)]);
  }

  function removeBack() {
    if (deckRef.current && deckRef.current.swipeBack) {
      const { item, index } = deckRef.current.swipeBack();
      console.log('%cremoveBack', 'color: brown', { item, index })
    }
  }

  function swipeLeft() {
    if (deckRef.current && deckRef.current.swipeLeft) {
      const { item, index } = deckRef.current.swipeLeft();
      console.log('%cswipeLeft', 'color: green', { item, index })
    }
  }

  function swipeRight() {
    if (deckRef.current && deckRef.current.swipeRight) {
      const { item, index } = deckRef.current.swipeRight();
      console.log('%cswipeRight', 'color: blue', { item, index })
    }
  }

  function onSwipeLeft(item, index) {
    console.log('onSwipeLeft', { item, index })
  }

  function onSwipeRight(item, index) {
    console.log('onSwipeRight', { item, index })
  }

  function jumpToCardIndex(index) {
    if (deckRef.current && deckRef.current.jumpToCardIndex) {
      deckRef.current.jumpToCardIndex(index);
    }
  }

  function updateCardName(value) {
    if (deckRef.current && deckRef.current.currentIndex >= 0) {
      const currIndex = deckRef.current.currentIndex;
      deckRef.current.updateCard(currIndex, (card) => {
        return { ...card, name: value };
      });
    }
  }

  function onSwipeEnd() {
    // console.log('END')
  }

  function onSwipeStart() {
    // console.log('START')
  }

  function cardClick(i) {
    console.log('CLICK', i)
  }

  const renderItem = useCallback(({ height, name }, i) => (
    <div className="my-card" key={`cardItem__${i}`}>
      <div className="my-card__img">
        image
      </div>
      <div className="my-card__text-content" style={{ height }} onClick={() => cardClick(i)}>
        <div style={{ color: 'red', textAlign: 'center' }}>
          card text
          <div>{name}</div>
        </div>
      </div>
    </div>
  ), []);

  return (
    <div className="App">
      <div className="controllers-wrapper">
        <button className="controller" onClick={addItems}>Add cards</button>
        <button className="controller" onClick={removeBack}>Return Last</button>
        <button className="controller" onClick={swipeLeft}>Swipe Left</button>
        <button className="controller" onClick={swipeRight}>Swipe Right</button>
        <input id="next-index" type="number" placeholder="index" min={0} className="input"/>
        <button className="controller" onClick={() => jumpToCardIndex(document.getElementById('next-index').value)}>To index</button>
        <input id="new-name" placeholder="name" className="input"/>
        <button className="controller" onClick={() => updateCardName(document.getElementById('new-name').value)}>Set new name</button>
      </div>
      <p style={{ padding: '0 16px', margin: 0, color: '#CECECE', fontStyle: 'italic' }}>Deck adapts its height on viewport height change</p>
      <Deck
        items={items}
        renderItem={renderItem}
        ref={deckRef}
        adaptiveHeight={true}
        maxVisibleStack={4}
        leftLabel={<div style={{ position: 'absolute', right: 0 }}>LEFT</div>}
        rightLabel={<div style={{ position: 'absolute', left: 0 }}>RIGHT</div>}
        onSwipeLeft={onSwipeLeft}
        onSwipeRight={onSwipeRight}
        onSwipeEnd={onSwipeEnd}
        onSwipeStart={onSwipeStart}
      />
    </div>
  );
}

export default App;
