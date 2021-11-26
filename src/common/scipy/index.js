import tf from "@tensorflow/tfjs";

/**
 * This code is the translation of C/Python functions of https://github.com/scipy/scipy.
 * Some parameters and branches have been removed because the code is unreachable in our case.
 * All input arrays are 1D-arrays.
 */

function FLOAT_filt(b, a, x, y, Z) {
    const a0 = a[0];

    // normalize the filter coefs only once.
    for (let n = 0; n < b.length; n++) {
        b[n] = b[n].div(a0);
        a[n] = a[n].div(a0);
    }

    for (let k = 0; k < x.length; k++) {
        if (b.length > 1) {
            // Calculate first delay (output)
            y[k] = x[k].mul(b[0]).add(Z[0]);

            // Fill in middle delays
            for (let n = 0; n < b.length - 2; n++) {
                Z[n] = x[k].mul(b[n + 1]).sub(y[k].mul(a[n + 1])).add(Z[1]);
            }

            // Calculate last delay
            Z[Z.length - 1] = x[k].mul(b[b.length - 1]).sub(y[k].mul(a[a.length - 1]));
        } else {
            y[k] = x[k].mul(b[0]);
        }
    }
}

// Copy the first nx items of x into xzfilled , and fill the rest with 0s
function zfill(x, nx, xzfilled, nxzfilled) {
    for (let i = 0; i < nx; i++) {
        let tmp = x[i];
        x[i] = xzfilled[i];
        xzfilled[i] = tmp;
    }

    for (let i = nx; i < nxzfilled; i++) {
        xzfilled[i] = tf.scalar(0);
    }
}

// RawFilter with zi=NULL, zf=NULL, axis=0 and filter_func=FLOAT_filt
function RawFilter(b, a, x, y) {
    const na = a.length;
    const nb = b.length;
    const nfilt = na > nb ? na : nb;

    const azfilled = Array.apply(null, new Array(nfilt)).map(() => tf.scalar(0));
    const bzfilled = Array.apply(null, new Array(nfilt)).map(() => tf.scalar(0));
    const zfzfilled = Array.apply(null, new Array(nfilt - 1)).map(() => tf.scalar(0));

    zfill(a, na, azfilled, nfilt);
    zfill(b, nb, bzfilled, nfilt);

    for (let i = 0; i < x.length; i++) {
        zfill(x, 0, zfzfilled, nfilt - 1);

        FLOAT_filt(bzfilled, azfilled, x, y, zfzfilled);
    }
}

// _linear_filter with axis = 0 and Vi = NULL
function _linear_filter(b, a, X) {
    const arY = new Array(X.length);
    RawFilter(b, a, X, arY);

    return arY
}

// lfilter with axis = 0 and zi=None
function lfilter(b, a, x) {
    return tf.tidy(() => _linear_filter(b, a, x));
}

export default { lfilter };
