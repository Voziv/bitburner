// const SPINNER_CHARACTERS = [ '|', '/', '-', '\\' ];
// const SPINNER_CHARACTERS = '⣾⣽⣻⢿⡿⣟⣯⣷ ⠁⠂⠄⡀⢀⠠⠐⠈';
// const SPINNER_CHARACTERS = '▉▊▋▌▍▎▏▎▍▌▋▊▉';
// const SPINNER_CHARACTERS = '┤┘┴└├┌┬┐';
const SPINNER_CHARACTERS = '◤◥◢◣';


export class Spinner {
    private index = 0;

    next() {
        if (this.index >= SPINNER_CHARACTERS.length) {
            this.index = 0;
        }
        return SPINNER_CHARACTERS[this.index++];
    }

}