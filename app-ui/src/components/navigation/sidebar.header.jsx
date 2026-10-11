import { Fragment } from 'react';

const SidebarHeader = (props) => {
  const {
    collapsed
  } = props

  return (
    <Fragment>
      <div className="d-flex justify-content-center align-items-center">
        <img
          alt="darts score logo"
          src="/logo.svg"
          width="60"
          height="60"
          className="d-inline-block"
        />
        {!collapsed &&
          <span className="ps-3 fw-semibold fs-7">Darts Score</span>
        }
      </div>
    </Fragment>
  );
};

export default SidebarHeader;