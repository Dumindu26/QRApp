import { Minus, Plus, ShoppingCart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useCurrency } from '../context/CurrencyContext';

export function CartButton() {
  const { itemCount, total, items, updateQty } = useCart();
  const navigate = useNavigate();
  const { fmt } = useCurrency();

  return (
    <>
      {itemCount > 0 && (
        <div className="fixed bottom-6 left-0 right-0 z-50 flex justify-center px-4 md:hidden">
          <button onClick={() => navigate('/cart')} className="w-full max-w-sm bg-orange-500 text-white rounded-2xl px-5 py-4 flex items-center justify-between shadow-lg hover:bg-orange-600 transition-colors">
            <span className="bg-white/20 rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold">{itemCount}</span>
            <span className="font-semibold flex items-center gap-2"><ShoppingCart size={18} />View Cart</span>
            <span className="font-bold">{fmt(total)}</span>
          </button>
        </div>
      )}
      <aside className="fixed bottom-0 right-0 top-[132px] z-30 hidden w-72 flex-col border-l border-gray-100 bg-white p-4 md:flex">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="font-bold text-gray-900">Your order</p>
            <p className="text-xs text-gray-400">{itemCount ? `${itemCount} item${itemCount === 1 ? '' : 's'}` : 'No items yet'}</p>
          </div>
          <ShoppingCart size={20} className="text-orange-500" />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center px-4 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-orange-50"><ShoppingCart size={21} className="text-orange-300" /></div>
              <p className="text-sm font-medium text-gray-500">Your order is empty</p>
              <p className="mt-1 text-xs text-gray-400">Add an item from the menu</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {items.map((item, index) => (
                <li key={`${item.menuItemId}-${item.size ?? 'regular'}-${index}`} className="py-3">
                  <div className="flex gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-800">{item.name}</p>
                      <p className="text-xs text-gray-400">{fmt(item.price * item.quantity)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => updateQty(item.menuItemId, item.size, item.toppings, item.quantity - 1, item.modifiers)} className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-gray-500"><Minus size={12} /></button>
                      <span className="w-5 text-center text-sm font-bold">{item.quantity}</span>
                      <button onClick={() => updateQty(item.menuItemId, item.size, item.toppings, item.quantity + 1, item.modifiers)} className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-100 text-orange-600"><Plus size={12} /></button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="border-t border-gray-100 pt-3">
          <div className="mb-3 flex items-center justify-between font-bold text-gray-900"><span>Total</span><span>{fmt(total)}</span></div>
          <button onClick={() => navigate('/cart')} disabled={itemCount === 0} className="w-full rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-40">Review order</button>
        </div>
      </aside>
    </>
  );
}
