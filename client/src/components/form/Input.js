import React, { Fragment } from 'react';

const Input = props => {
	// input checkbox, text, number,
	let element;

	if(props.element === 'input') {
		element = (
			<input
				id={props.id}
				type={props.type} 
				className={props.classNameInput} 
				name={props.name} 
				value={props.value}
				placeholder={props.placeholder}
				checked={props.checked}
				onChange={props.onChange}
				minLength={props.minLength}
				maxLength={props.maxLength}
				required={props.required}
			/>
		)
	}
	
	if(props.element === 'select') {
		element = (
			<div className="select-input-container">
				<select id={props.id} name={props.name} value={props.value} onChange={props.onChange} className="select-input" required>
					{props.children}
				</select>
			</div>
		)
	}

	return (
		<Fragment>
			{props.label &&
				<label htmlFor={props.htmlFor} className={props.classNameLabel}>{props.label}</label>
			}
			{element}
		</Fragment>
	)

}

export default Input
