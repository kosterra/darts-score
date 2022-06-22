import React from 'react';
import { NavLink } from 'react-router-dom';

import './NavLinks.css';

const NavLinks = () => {
  return (
    <ul className="nav-links">
      <li>
        <NavLink to="/stats">Statistics</NavLink>
      </li>
      <li>
        <NavLink to="/about">About</NavLink> 
      </li>
    </ul>
  )
}

export default NavLinks
