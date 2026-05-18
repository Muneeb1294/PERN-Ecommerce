import { Menu, User, ShoppingCart, Sun, Moon, Search } from "lucide-react";
import { useTheme } from "../../contexts/ThemeContext";
import { useDispatch, useSelector } from "react-redux";
import {
  toggleSidebar,
  toggleSearchBar,
  toggleAuthPopup,
  toggleCart,
} from "../../store/slices/popupSlice";

const Navbar = () => {
  const { theme, toggleTheme } = useTheme();

  const dispatch = useDispatch();

  const { cart } = useSelector((state) => state.cart);

  let cartItemsCount = 0;
  if (cart) {
    cartItemsCount = cart.reduce((total, item) => total + item.quantity, 0);
  }

  return (
    <>
      <nav className="fixed left-0 w-full top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container max-w-7x1 mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Left hamburger menu */}
            <button
              type="button"
              className="p-2 rounded-lg hover:bg-secondary transition-colors"
              onClick={() => dispatch(toggleSidebar())}
            >
              <Menu className="w-6 h-6 text-foreground" />
            </button>
            {/* Center Logo */}
            <div className="flex-1 flex justify-center">
              <h1 className="text-2xl font-bold text-primary">ShopMate</h1>
            </div>
            {/* Right search and cart */}
            <div className="flex items-center space-x-2">
              <button
                // Theme Toggle Button
                type="button"
                className="p-2 rounded-lg hover:bg-secondary transition-colors"
                onClick={() => toggleTheme()}
              >
                {theme === "dark" ? (
                  <Sun className="w-5 h-5 text-foreground" />
                ) : (
                  <Moon className="w-5 h-5 text-foreground" />
                )}
              </button>
              {/*  Search overlay */}
              <button
                // Search overlay button
                type="button"
                className="p-2 rounded-lg hover:bg-secondary transition-colors"
                onClick={() => dispatch(toggleSearchBar())}
              >
                <Search className="w-5 h-5 text-foreground" />
              </button>
              {/*  User profile */}
              <button
                type="button"
                className="p-2 rounded-lg hover:bg-secondary transition-colors"
                onClick={() => dispatch(toggleAuthPopup())}
              >
                <User className="w-5 h-5 text-foreground" />
              </button>
              {/*  Cart */}
              <button
                type="button"
                className="relative p-2 rounded-lg hover:bg-secondary transition-colors"
                onClick={() => dispatch(toggleCart())}
              >
                <ShoppingCart className="w-5 h-5 text-foreground" />
                {cartItemsCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {cartItemsCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
};
export default Navbar;
