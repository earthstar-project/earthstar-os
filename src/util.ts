export let sleep = async (ms : number) : Promise<void> => {
    return new Promise((resolve, reject) => {
        setTimeout(resolve, ms);
    });
}

// Return the non-null items in a list.
// Normally you'd just use a filter() for this, but
// Typescript doesn't understand that properly.
export let notNull = <T>(items : Array<T | null>) : T[] =>
    items.filter(t => t !== null) as T[];

// sort the array, mutating it, and return the mutated array
export let sorted = <T>(items : T[]) : T[] => {
    items.sort();
    return items;
}
