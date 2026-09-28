import { fallbackGradientFor, type TopAccount } from './accounts';
import './AccountStack.css';

interface AccountStackProps {
  accounts: TopAccount[];
}

export default function AccountStack({ accounts }: AccountStackProps) {
  return (
    <div className="account-stack">
      {accounts.map((account) => (
        <div key={account.username} className="account-avatar-wrap">
          <div
            className="account-avatar"
            style={account.avatarUrl ? undefined : { background: fallbackGradientFor(account.username) }}
          >
            {account.avatarUrl ? (
              <img src={account.avatarUrl} alt={`@${account.username}`} />
            ) : (
              account.username.slice(0, 2).toUpperCase()
            )}
          </div>
          <div className="account-tooltip">@{account.username}</div>
        </div>
      ))}
    </div>
  );
}
