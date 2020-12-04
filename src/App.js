import React, { useState, useEffect, useRef, useCallback } from 'react';
import Swiper from './Deck/Deck';
import './App.css';

let deck = [
  { id: 1, name: 'A' },
  { id: 2, name: 'B' },
  { id: 3, name: 'C' },
  { id: 4, name: 'D' },
  { id: 5, name: 'E' },
];
let next_deck = [
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

const randomH = [...deck, ...next_deck].map(o => getRandomInt(50, 250));

function App() {
  const [items, set] = useState(deck);
  const swiperRef = useRef(null);

  function removeBack() {
    if (swiperRef.current && swiperRef.current.swipeBack) {
      swiperRef.current.swipeBack();
    }
  }

  function swipeLeft() {
    if (swiperRef.current && swiperRef.current.swipeLeft) {
      const { item, index } = swiperRef.current.swipeLeft();
      console.log('swipeLeft', item, index)
    }
  }

  function swipeRight() {
    if (swiperRef.current && swiperRef.current.swipeRight) {
      const { item, index } = swiperRef.current.swipeRight();
      console.log('swipeRight', item, index)
    }
  }

  function onSwipeLeft(item, i) {
    console.log('onSwipeLeft', item, i)
  }

  function onSwipeRight(item, i) {
    console.log('onSwipeRight', item, i)
  }

  function jumpToCardIndex(index) {
    if (swiperRef.current && swiperRef.current.jumpToCardIndex) {
      swiperRef.current.jumpToCardIndex(index);
    }
  }

  function onSwipeEnd() {
    // console.log('END')
  }

  function onSwipeStart() {
    // console.log('START')
  }

  function cardClick() {
    console.log('CLICK')
  }

  const renderItem = useCallback((item, i) => (
    <div className="my-card">
      <div className="my-card__img">
        image
      </div>
      <div className="my-card__text-content" style={{ height: randomH[i] }} onClick={cardClick}>
        <div style={{ color: 'red', textAlign: 'center' }}>
          card text
          <div>{item.name}</div>
        </div>
      </div>
    </div>
  ), []);

  return (
    <div className="App">
      <div className="controllers-wrapper">
        <button className="controller" onClick={() => set([...deck, ...next_deck])}>Add cards</button>
        <button className="controller" onClick={removeBack}>Return Last</button>
        <button className="controller" onClick={swipeLeft}>Swipe Left</button>
        <button className="controller" onClick={swipeRight}>Swipe Right</button>
        <input id="next-index" type="number" placeholder="index" min={0} className="input"/>
        <button className="controller" onClick={() => jumpToCardIndex(document.getElementById('next-index').value)}>To index</button>
      </div>
      <Swiper
        items={items}
        renderItem={renderItem}
        ref={swiperRef}
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
