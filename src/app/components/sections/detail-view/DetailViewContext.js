import { createContext } from 'react'

export const DetailViewContext = createContext({
    activeSection: '',
    registerSection: () => {},
    sections: [],
    setActiveSection: () => {}
})
