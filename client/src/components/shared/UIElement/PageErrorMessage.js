import React from 'react';

const PageErrorMessage = props => {
  const {title, message} = props
  return (
    <div className="page-error">
      <h2 className="page-error-title">{title}</h2>
      <div className="page-error-message">{message}</div>
      <div className="page-error-buttons">
        {props.children}
      </div>
    </div>
  )
}

export default PageErrorMessage
