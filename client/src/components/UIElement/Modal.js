import React, { Fragment } from 'react';
import ReactDom from 'react-dom';

const Modal = props => { 
  let modalMainElement;

  const stopPropagation = e => {
      e.stopPropagation();
  }

  if(props.isForm) {
    modalMainElement = (
        <form onSubmit={props.onSubmit}>
            <div className={`modal-content ${props.contentClass}`}>
                {props.children}
            </div>
            <footer className={`modal-footer ${props.footerClass}`}>
                {props.footer}
            </footer>
        </form>
    )
  }

  if(props.isDiv) {
    modalMainElement = (
        <Fragment>
            <div className={`modal-content ${props.contentClass}`}>
                {props.children}
            </div>
            <footer className={`modal-footer ${props.footerClass}`}>
                {props.footer}
            </footer>
        </Fragment>
    )
  }

  const content = (
      <div className="modal-background" onClick={props.onClickModalBackground}>
        <div className={`modal ${props.className}`} style={props.style} onClick={stopPropagation}>
            <header className={`modal-header ${props.headerClass}`}>
                <h2>{props.header}</h2>
            </header>
            {modalMainElement}
        </div>
      </div>
   
  )

  return ReactDom.createPortal(content , document.getElementById('modal-hook'))
}

export default Modal
