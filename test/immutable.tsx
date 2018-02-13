import * as React from 'react';
import * as I from 'immutable';
import { test } from 'ava';
import { Simulate } from 'react-dom/test-utils';
import { connect, createStore, Store } from '../src';

interface AppStore {
  fruits: I.Map<string, number>
}

const initialFruits = I.Map({
  banana: 100,
})

const store = createStore<AppStore>({
  fruits: initialFruits,
});

const withStore = connect(store);

const MyComponent = withStore('fruits')(({ store }) => {
  const fruits = store.get('fruits');
  const updateBanena = () =>
    store.set('fruits')(fruits.set('banana', 100));

  return (
    <div>
      <button onClick={updateBanana}>Update</button>
      <div>{fruits.get('banana')}</div>
    </div>
  );
});
