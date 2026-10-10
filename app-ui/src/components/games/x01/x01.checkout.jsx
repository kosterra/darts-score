import { Panel } from 'primereact/panel';
import checkout from '../../../utils/checkout';

const Checkout = ({ score }) => {
  const checkouts = checkout?.[score] || [];

  return (
    <Panel header="Checkout" className="w-100 mx-auto panel-brighter-bg">
      {checkouts.length > 0 ? (
        checkouts.map((c, i) => (
          <div key={i} className="text-center text-shade400 fs-8">
            {c}
          </div>
        ))
      ) : (
        <div className="text-center text-shade600 fs-8 fst-italic">No checkout available</div>
      )}
    </Panel>
  );
};

export default Checkout;
