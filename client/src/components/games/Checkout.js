import React from 'react';

import checkout from '../utils/checkout';

import './Checkout.css';

const Checkout = props => {
  const { score } = props

  return (
    <div className="checkout-container">
      <p className="checkout-title">
        Checkout
      </p>
      <div className="checkout-list" >
        {checkout[score].map((c, i) => {
          return <span key={i}>{c}</span>
        })}
      </div>
    </div>
  )
}

export default Checkout
