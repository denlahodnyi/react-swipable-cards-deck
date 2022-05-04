import React, { useState, useEffect, useLayoutEffect, forwardRef, useRef, useImperativeHandle, useCallback, memo } from 'react'
import { useSprings, animated, interpolate as to } from 'react-spring';
import { useDrag } from 'react-use-gesture';
import map from 'lodash/map';
import forEach from 'lodash/forEach';
import debounce from 'lodash/debounce';
import './Deck.css';

const baseTo = (i, shiftY, translateZ, gone = new Set(), ungoneIdxs = [], currentIndex, maxVisibleStack) => {
  const isGone = gone && gone.has(i);
  const index = isGone ? 0 : ungoneIdxs.length ? ungoneIdxs.indexOf(i) : i;

  return {
    x: 0,
    y: index * shiftY,
    z: index * translateZ,
    rot: 0,
    delay: index * 100,
    visible: isGone || i > (currentIndex + maxVisibleStack) ? 0 : 1,
  };
};
const baseFrom = (i, gone = new Set(), ungoneIdxs = []) => {
  const firstIdx = gone.length && ungoneIdxs.length ? ungoneIdxs[0] : 0;
  return { x: 0, y: 0, z: 0, rot: 0, visible: i === firstIdx ? 1 : 0 };
};
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
    initIndex = 0,
    items,
    leftLabel,
    maxVisibleStack,
    onDeckHeightChange,
    onSwipeLeft,
    onSwipeRight,
    onSwipeStart,
    onSwipeEnd,
    renderItem,
    // resizeDebounce = DEBOUNCE,
    rightLabel,
    shiftY = CARD_SHIFT_Y,
    translateZ = TRANSLATE_Z,
    trashhold = TRASHHOLD
  } = props;
  const [logs, setLogs] = useState({ drag: {}, heights: [] });
  const [deck, setDeck] = useState([...items]);
  const [deckChanged, setDeckChanged] = useState(0);
  const [gone, setGone] = useState(setGoneCardsOnInit);
  const [currentIndex, setCurrentIndex] = useState(initIndex);
  const [label, setLabel] = useState('');
  const [height, setHeight] = useState(0);
  const [resize, setResize] = useState(0);
  const [isCardSwiped, setIsCardSwiped] = useState(false);
  const [springs, setSprings, stopSprings] = useSprings(deck.length, i => ({
    ...baseTo(i, shiftY, translateZ, gone, getUngoneIndexes(), currentIndex, maxVisibleStack),
    from: baseFrom(i, gone, getUngoneIndexes())
  }));
  const containerHeight = height + (deck.length === 1 ? 0 : deck.length <= maxVisibleStack ? deck.length * shiftY : maxVisibleStack * shiftY);
  // const viewPort = window.innerWidth + 200;
  // console.log('containerHeight', containerHeight);
  // console.log('height', height);
  // console.log('logs', logs);

  const elements = useRef([{}, false]);
  const heightRef = useRef(height);
  const prevItems = useRef(items);

  const cardChildMeasureRef = useCallback(node => {
    const [elList, isFullList] = elements.current || [{}, false];
    if (adaptiveHeight && node !== null && elements.current && (!elList[node.id] || elList[node.id].offsetHeight !== node.offsetHeight)) {
      elList[node.id] = node;
      elements.current[1] = Object.keys(elList).length === deck.length;
      if (elements.current[1]) setResize(n => n + 1);
    }
  }, [deckChanged]);

  function setGoneCardsOnInit() {
    const gone = new Set();

    if (initIndex > 0 && items.length) {
      forEach(items, (item, i) => {
        if (i < initIndex) gone.add(i);
      });
    }

    return gone;
  }

  useEffect(() => {
    if (adaptiveHeight && elements.current[1]) {
      function calcMax() {
        const arr = map(elements.current[0], (el) => {
          el.style = '';
          const contentHeight = el.offsetHeight;
          el.style = 'flex: 1;';
          return contentHeight;
        });
        const max = Math.max(...arr);
        if (max !== heightRef.current) {
          heightRef.current = max;
          setHeight(max);
        }
      }
      function resizeCb() {
        calcMax();
      }
      const debouncedResCb = debounce(resizeCb, 1000);
      window.addEventListener('resize', debouncedResCb);
      calcMax();
      return () => {
        window.removeEventListener('resize', debouncedResCb);
      };
    }
  }, [adaptiveHeight, resize]);

  useEffect(() => {
    if (onDeckHeightChange) onDeckHeightChange(containerHeight);
  }, [containerHeight]);

  useEffect(() => {
    const nextGone = setGoneCardsOnInit();

    if (prevItems.current !== items) {
      gone.clear();
      // itemsHeight.clear();
      elements.current = [{}, false];
      heightRef.current = 0;
      setHeight(0);
      setDeck(items);
      setCurrentIndex(initIndex);
      setDeckChanged(i => i + 1);
      setIsCardSwiped(!!nextGone.size);
    }

      setGone(nextGone);
  }, [JSON.stringify(items)]);

  useEffect(() => {
    prevItems.current = items
  });

  useImperativeHandle(ref, () => {
    return {
      currentIndex,
      isCardSwiped,
      jumpToCardIndex,
      swipeBack,
      swipeLeft,
      swipeRight,
      updateCard,
    };
  });

  function updateCard(cardIndex, cb = () => {}) {
    if (cardIndex >= 0 && deck[cardIndex]) {
      const updCard = cb(deck[cardIndex]);
      if (updCard) {
        const nextDeck = [...deck];
        nextDeck[cardIndex] = updCard;
        setDeck(nextDeck);
      }
    }
  }

  function getNextCardsIndexes(currIndex) {
    return deck[currIndex] ? deck.map((o, i) => i).splice(currIndex, deck.length) : [];
  }

  function getUngoneIndexes() {
    return deck.map((o, i) => !gone.has(i) && i).filter(i => i !== false);
  }

  function getX(dir) {
    return (200 + window.innerWidth) * dir;
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
            return { x: (200 + window.innerWidth) * -1, rot: 70, visible: 0, delay: 0, };
          }
        } else {
          if (gone.has(i)) gone.delete(i);
          const visible = i > (index + maxVisibleStack) ? 0 : 1;
          return {
            x: 0,
            y: ungone.indexOf(i) * shiftY,
            z: ungone.indexOf(i) * translateZ,
            rot: 0,
            visible,
            delay: 0
          };
        }
      });
      setCurrentIndex(index);
    }
  }

  function swipeBack() {
    const goneArr = [...gone];
    const index = goneArr[goneArr.length - 1];
    const nextCurrentIndex = currentIndex === 0 ? currentIndex : currentIndex - 1;

    if (index >= 0 && deck[index]) {
      gone.delete(index);
      const ungone = getUngoneIndexes();
      setSprings(i => {
        if (!gone.has(i) && ungone.length) {
          const visible = i > (nextCurrentIndex + maxVisibleStack) ? 0 : 1;
          return {
            x: 0,
            y: ungone.indexOf(i) * shiftY,
            z: ungone.indexOf(i) * translateZ,
            rot: 0,
            visible,
            delay: 0
          };
        }
        return { visible: 0 };
      });
      setCurrentIndex(nextCurrentIndex);
      setIsCardSwiped(gone.size !== 0);

      return { item: deck[index], index };
    }

    return {};
  }

  function swipeLeft(index) {
    const cardIndexToSwipe = index >= 0 ? index : currentIndex;
    const dir = -1;
    const x = getX(dir);
    const nextCurrentIndex = cardIndexToSwipe === currentIndex ? currentIndex + 1 : currentIndex;

    gone.add(cardIndexToSwipe);
    const ungone = getUngoneIndexes();
    setSprings(i => {
      if (i === cardIndexToSwipe) return { x, rot: 70, visible: 0, delay: 0, config: { friction: 50, tension: 500 } };
      if (!gone.has(i) && ungone.length) {
        const visible = i > (nextCurrentIndex + maxVisibleStack) ? 0 : 1;
        return {
          x: 0,
          y: ungone.indexOf(i) * shiftY,
          z: ungone.indexOf(i) * translateZ,
          rot: 0,
          visible,
          delay: 0
        };
      }
    });
    setCurrentIndex(nextCurrentIndex);
    setIsCardSwiped(true);

    return { item: deck[cardIndexToSwipe], index: cardIndexToSwipe };
  }

  function swipeRight(index) {
    const cardIndexToSwipe = index >= 0 ? index : currentIndex;
    const dir = 1;
    const x = getX(dir);
    const nextCurrentIndex = cardIndexToSwipe === currentIndex ? currentIndex + 1 : currentIndex;

    gone.add(cardIndexToSwipe);
    const ungone = getUngoneIndexes();
    setSprings(i => {
      if (i === cardIndexToSwipe) return { x, rot: -70, visible: 0, delay: 0, config: { friction: 50, tension: 500 } };
      if (!gone.has(i) && ungone.length) {
        const visible = i > (nextCurrentIndex + maxVisibleStack) ? 0 : 1;
        return {
          x: 0,
          y: ungone.indexOf(i) * shiftY,
          z: ungone.indexOf(i) * translateZ,
          rot: 0,
          visible,
          delay: 0
        };
      }
    });
    setCurrentIndex(nextCurrentIndex);
    setIsCardSwiped(true);

    return { item: deck[cardIndexToSwipe], index: cardIndexToSwipe };
  }

  const bind = useDrag(gestureState => {
    const { event, args: [index], down, movement: [mx], direction: [xDir] } = gestureState;
    const dir = xDir < 0 ? -1 : 1;
    const humanDir = mx < 0 ? 'left' : 'right';
    let onRest = () => {};
    let isReadyToLeave = false;

    if (onSwipeStart) onSwipeStart(humanDir);

    setSprings(i => {
      if (index !== i) return; // We're only interested in changing spring-data for the current spring
      let x = down ? mx : 0;
      let rot = -1 * Math.floor(mx / 10);
      let visible = 1;
      isReadyToLeave = Math.abs(mx) >= trashhold && ((xDir <= 0 && humanDir === 'left') || (xDir >= 0 && humanDir === 'right'));
      changeLabel(mx, down);
      if (!down && !isReadyToLeave) rot = 0;
      if (!down && isReadyToLeave) {
        const ungone = getUngoneIndexes();
        const nextCurrentIndex = i + 1;
        gone.add(i);
        x = getX(humanDir === 'left' ? -1 : 1);
        rot = humanDir === 'left' ? 70 : -70;
        visible = 0;
        setCurrentIndex(nextCurrentIndex);
        setIsCardSwiped(true);
        setSprings(i => {
          if (!gone.has(i) && ungone.length) {
            const visible = i > (nextCurrentIndex + maxVisibleStack) ? 0 : 1;
            return {
              x: 0,
              y: ungone.indexOf(i) * shiftY,
              z: ungone.indexOf(i) * translateZ,
              rot: 0,
              visible,
              delay: 0
            };
          }
        });
        setLabel('');
        if (humanDir === 'left') onSwipeLeft(deck[i], i);
        if (humanDir === 'right') onSwipeRight(deck[i], i);
      }

      setLogs(o => ({ ...o, drag: { eventType: event.type, pointerType: event.pointerType, down } }));

      return { x, rot, visible, delay: 0, config: { friction: 50, tension: down ? 800 : 500 }, onRest }
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
          {map(springs, ({ x, y, z, rot, visible }, i, arr) => {

            return (
              <animated.div
                key={`animated__${i}`}
                style={{
                  visibility: visible.interpolate(v => !v ? 'hidden' : 'visible'), // change 'interpolate' on v9
                  opacity: visible,
                  zIndex: i === currentIndex ? 0 : i > currentIndex ? -i : 0,
                  transform: to([x, y, rot], containerTrans),
                  touchAction: 'pan-y' /* required on Android */
                }}
                className="card-container"
              >
                <animated.div
                  {...bind(i)}
                  id={`card__${i}`}
                  style={{
                    ...adaptiveHeight ? { boxSizing: 'border-box' } : {},
                    transform: to([z], cardTrans)
                  }}
                  className={`card-outer ${i === currentIndex ? 'front-card' : ''}`}
                >
                  {i === currentIndex && label === 'left' && leftLabel}
                  {i === currentIndex && label === 'right' && rightLabel}
                  <div
                    id={`card_ch_${i}`}
                    ref={cardChildMeasureRef}
                    className="card-inner"
                    // style={{ ...adaptiveHeight ? { boxSizing: 'border-box' } : {}, /* border-box is required if adaptiveHeight enabled */ }}
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
