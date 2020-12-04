import React, { useState, useEffect, useLayoutEffect, forwardRef, useRef, useImperativeHandle, useCallback, memo } from 'react'
import PropTypes from 'prop-types';
import { useSprings, animated, interpolate } from 'react-spring';
import { useDrag } from 'react-use-gesture';
import map from 'lodash/map';
import debounce from 'lodash/debounce';
import isEqual from 'lodash/isEqual';
import './Deck.css';

// These two are just helpers, they curate spring data, values that are later being interpolated into css
const to = (i, shiftY, translateZ) => ({ x: 0, y: i * shiftY, z: i * translateZ, rot: 0, delay: i * 100 });
const from = i => ({ x: 0, y: 0, z: 0, rot: 0 });
// This is being used down there in the view, it interpolates rotation and scale into a css transform
const cardTrans = (z) => `perspective(1500px) translateZ(${z}px)`;
const containerTrans  = (x, y, rot) => {
  return !x && !y ? 'none' : `translate3d(${x}px, ${y}px, 0px) rotate(${rot}deg)`;
};
const useGestureOpts = { filterTaps: true };
const CARD_SHIFT_Y = 13;
const TRANSLATE_Z = -30;
const TRASHHOLD = 70;
const DEBOUNCE = 1000;

const Deck = forwardRef((props, ref) => {
  const {
    adaptiveHeight,
    shiftY = CARD_SHIFT_Y,
    items,
    leftLabel,
    maxVisibleStack,
    onSwipeLeft,
    onSwipeRight,
    onSwipeStart,
    onSwipeEnd,
    renderItem,
    resizeDebounce = DEBOUNCE,
    rightLabel,
    translateZ = TRANSLATE_Z,
    trashhold = TRASHHOLD
  } = props;
  const [logs, setLogs] = useState({ drag: {}, heights: [] });
  const [deck, setDeck] = useState([...items]);
  const [gone] = useState(() => new Set());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [label, setLabel] = useState('');
  const [height, setHeight] = useState(0);
  const [resize, setResize] = useState(0);
  const [springs, setSprings] = useSprings(deck.length, i => ({ ...to(i, shiftY, translateZ), from: from(i) })); // Create a bunch of springs using the helpers above
  const containerHeight = height + (deck.length === 1 ? 0 : deck.length <= maxVisibleStack ? deck.length * shiftY : maxVisibleStack * shiftY);
  const viewPort = window.innerWidth + 200;
  console.log('containerHeight', containerHeight);
  console.log('height', height);
  console.log('logs', logs);
  console.log('resize', resize);

  const elements = useRef([{}, false]);
  const heightRef = useRef(height);
  const prevItems = useRef(items);

  const cardChildMeasureRef = useCallback(node => {
    setTimeout(() => {
      if (adaptiveHeight && node !== null && elements.current && (!elements.current[0][node.id] || elements.current[0][node.id].offsetHeight !== node.offsetHeight)) {
        // console.log('node.offsetHeight', node.id, node.offsetHeight)
        elements.current[0][node.id] = node;
        elements.current[1] = Object.keys(elements.current[0]).length === deck.length;
        if (elements.current[1]) setResize(n => n + 1);
      }
    }, 0)
  }, [JSON.stringify(deck)]);

  useEffect(() => {
    if (adaptiveHeight && elements.current[1]) {
      function calcMax() {
        const arr = map(elements.current[0], (el) => {
          el.style = '';
          const contentH = el.offsetHeight;
          el.style = 'flex: 1;';
          return contentH;
        });
        const max = Math.max(...arr);
        if (max !== height) {
          heightRef.current = max;
          setHeight(max);
        }
        setLogs(o => ({ ...o, heights: arr }));
      }
      function resizeCb() {
        calcMax();
      }
      const debouncedResCb = debounce(resizeCb, resizeDebounce);
      window.addEventListener("resize", debouncedResCb);
      calcMax();
      return () => {
        window.removeEventListener("resize", debouncedResCb);
      };
    }
  }, [adaptiveHeight, resize]);

  useEffect(() => {
    if (!isEqual(prevItems.current, items)) {
      gone.clear();
      elements.current = [{}, false];
      setHeight(0);
      setDeck(items);
      setCurrentIndex(0);
    }
  }, [JSON.stringify(items)]);

  useEffect(() => prevItems.current = items);

  useImperativeHandle(ref, () => {
    return {
      swipeBack,
      swipeLeft,
      swipeRight,
      jumpToCardIndex,
    };
  });

  function getNextCardsIndexes(currIndex) {
    return deck[currIndex] ? deck.map((o, i) => i).splice(currIndex, deck.length) : [];
  }

  function getX(dir) {
    return viewPort * dir;
  }

  function changeLabel(mx = 0, down = false) {
    if (down && Math.abs(mx) >= trashhold) {
      setLabel(mx < 0 ? 'left' : 'right');
    } else {
      setLabel('');
    }
  }

  function jumpToCardIndex(index = 0) {
    index = +index;
    if (index >= 0 && deck[index]) {
      const ungone = getNextCardsIndexes(index);
      setSprings(i => {
        if (i < index) {
          if (!gone.has(i)) {
            gone.add(i);
            return { x: viewPort * -1, rot: 70, delay: 0, };
          }
        } else {
          if (gone.has(i)) gone.delete(i);
          return { x: 0, y: ungone.indexOf(i) * shiftY, z: ungone.indexOf(i) * translateZ, rot: 0, delay: 0, };
        }
      });
      setCurrentIndex(index);
    }
  }

  function swipeBack() {
    const index = currentIndex - 1;
    if (index >= 0 && deck[index]) {
      const ungone = getNextCardsIndexes(index);
      setSprings(i => {
        if (i === index) {
          if (gone.has(i)) gone.delete(i);
          return { x: 0, y: 0, z: 0, rot: 0, delay: 0, };
        } else if (i > index) {
          return { x: 0, y: ungone.indexOf(i) * shiftY, z: ungone.indexOf(i) * translateZ, rot: 0, delay: 0, };
        }
      });
      setCurrentIndex(index);
    }
  }

  function swipeLeft() {
    const dir = -1;
    const ungone = getNextCardsIndexes(currentIndex + 1);
    const x = getX(dir);
    gone.add(currentIndex);
    setSprings(i => {
      if (i === currentIndex) return { x, y: 0, rot: 70, delay: 0, config: { friction: 50, tension: 500 } };
      if (!gone.has(i) && ungone.length) return { x: 0, y: ungone.indexOf(i) * shiftY, z: ungone.indexOf(i) * translateZ, rot: 0, delay: 0, };
    });
    setCurrentIndex(currentIndex + 1);
    return { item: deck[currentIndex], index: currentIndex };
  }

  function swipeRight() {
    const dir = 1;
    const ungone = getNextCardsIndexes(currentIndex + 1);
    const x = getX(dir);
    gone.add(currentIndex);
    setSprings(i => {
      if (i === currentIndex) return { x, rot: -70, delay: 0, config: { friction: 50, tension: 500 } };
      if (!gone.has(i) && ungone.length) return { x: 0, y: ungone.indexOf(i) * shiftY, z: ungone.indexOf(i) * translateZ, rot: 0, delay: 0, };
    });
    setCurrentIndex(currentIndex + 1);
    return { item: deck[currentIndex], index: currentIndex };
  }

  const bind = useDrag(gestureState => {
    const { event, canceled, args: [index], down, movement: [mx], direction: [xDir] } = gestureState;
    // xDir on stop could be 0 or last value
    const dir = xDir < 0 ? -1 : 1;
    const humanDir = mx < 0 ? 'left' : 'right';
    let onRest = () => {};
    let isReadyToLeave = false;
    // console.log('event', event)

    if (onSwipeStart) onSwipeStart(humanDir);

    setSprings(i => {
      if (index !== i) return; // We're only interested in changing spring-data for the current spring
      let x = down ? mx : 0;
      let rot = -1 * Math.floor(mx / 10);
      isReadyToLeave = Math.abs(mx) >= trashhold && ((xDir <= 0 && humanDir === 'left') || (xDir >= 0 && humanDir === 'right'));
      changeLabel(mx, down);
      if (!down && !isReadyToLeave) rot = 0;
      if (!down && isReadyToLeave) {
        const ungone = getNextCardsIndexes(i + 1);
        gone.add(i);
        x = getX(humanDir === 'left' ? -1 : 1);
        rot = humanDir === 'left' ? 70 : -70;
        setCurrentIndex(i + 1);
        setSprings(i => {
          if (!gone.has(i) && ungone.length) return { x: 0, y: ungone.indexOf(i) * shiftY, z: ungone.indexOf(i) * translateZ, rot: 0, delay: 0, };
        });
        setLabel('');
        // if (humanDir === 'left') onRest = () => onSwipeLeft(i);
        if (humanDir === 'left') onSwipeLeft(deck[i], i);
        if (humanDir === 'right') onSwipeRight(deck[i], i);
      }

      setLogs(o => ({ ...o, drag: { eventType: event.type, pointerType: event.pointerType, down } }));

      return { x, rot, delay: 0, config: { friction: 50, tension: down ? 800 : 500 }, onRest }
    });

    if (onSwipeEnd) onSwipeEnd(humanDir);
  }, useGestureOpts);

  return (
    <React.Fragment>
      <div style={{ padding: '0 16px', position: 'absolute', zIndex: 999 }}>
        <div style={{ wordBreak: 'break-all' }}>{'Drag logs: ' + JSON.stringify(logs.drag)}</div>
        <div style={{ wordBreak: 'break-all' }}>{'Items height: ' + JSON.stringify(logs.heights)}</div>
        <div style={{ wordBreak: 'break-all' }}>{'height: ' + height}</div>
        <div style={{ wordBreak: 'break-all' }}>{`Current index: ${currentIndex}`}</div>
      </div>

      <div className="deck-wrapper" style={{ ...adaptiveHeight && height > 0 ? { minHeight: containerHeight } : {} }}>
        <div className="deck" style={{ ...adaptiveHeight && height > 0 ? { height } : {} }}>
          {springs.map(({ x, y, z, rot }, i) => {
            return (
              <animated.div
                key={i}
                style={{
                  ...i > currentIndex + maxVisibleStack || x < viewPort * -1 ? { visibility: 'hidden' } : {},
                  zIndex: i === currentIndex ? 0 : i > currentIndex ? -i : 0,
                  transform: interpolate([x, y, rot], containerTrans),
                  // visibility: interpolate([x], (x) => {
                  //   return i > currentIndex + maxVisibleStack || (x < 0 ? x * -1 : x) >= viewPort ? 'hidden' : 'visible'
                  // })
                }}
                className="card-container"
              >
                <animated.div
                  {...bind(i)}
                  id={`card__${i}`}
                  style={{
                    transform: interpolate([z], cardTrans)
                  }}
                  className={`card-outer ${i === currentIndex ? 'front-card' : ''}`}
                >
                  {i === currentIndex && label === 'left' && leftLabel}
                  {i === currentIndex && label === 'right' && rightLabel}
                  <div
                    id={`card_ch_${i}`}
                    ref={cardChildMeasureRef}
                    className="card-inner"
                    style={{ ...adaptiveHeight ? { boxSizing: 'border-box' } : {}, /* border-box is required if adaptiveHeight enabled */ }}
                  >
                    {renderItem(deck[i], i)}
                  </div>
                </animated.div>
              </animated.div>
            );
          })}
        </div>
      </div>
    </React.Fragment>
  );
});

Deck.propTypes = {};

export default memo(Deck);
