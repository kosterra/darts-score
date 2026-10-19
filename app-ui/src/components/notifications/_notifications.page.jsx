import { Panel } from 'primereact/panel';

import NotificationList from './notification.list';

/**
 * Everything the user was told, e.g. that an admin deleted or repaired one of
 * their games for fair play.
 */
const NotificationsPage = () => (
    <div className="container-fluid p-4 border-0">
        <Panel header="Notifications">
            <NotificationList />
        </Panel>
    </div>
);

export default NotificationsPage;
