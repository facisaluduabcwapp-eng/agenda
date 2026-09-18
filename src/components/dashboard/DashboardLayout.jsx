import Sidebar from '../layout/Sidebar'
import Header from '../layout/Header'
import styles from '../../pages/Dashboard.module.css'

export default function DashboardLayout({ children }) {
	return (
		<div className={styles.container}>
			<Sidebar />
			<div className={styles.mainContent}>
				<Header />
				{children}
			</div>
		</div>
	)
}
